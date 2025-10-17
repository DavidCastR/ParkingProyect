const express = require ('express');
const path = require ('path');
const bodyParser = require ('body-parser');
const mysql = require ('mysql');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended:true}));
app.use(express.static(path.join(__dirname,'public')));

//Conexion a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'parking',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado a la base de datos MySQL');
    });

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/registrarcliente', (req,res) => {
    const {nombres, apellidos, email, telefono, password} = req.body;
    
    // Primero insertar en la tabla PERSONA
    const sqlPersona = 'INSERT INTO PERSONA (tipo_documento, numero_documento, nombres, apellidos, telefono, email) VALUES (?, ?, ?, ?, ?, ?)';
    
    // Por defecto asignamos tipo_documento como CC y generamos un número de documento temporal
    const tipoDocumento = 'CC';
    const numeroDocumento = 'TEMP' + Date.now(); // Número temporal único
    
    db.query(sqlPersona, [tipoDocumento, numeroDocumento, nombres, apellidos, telefono || null, email], (err, result) => {
        if(err){
            console.error('Error al insertar persona:', err);
            res.send('<h2>Hubo un error al guardar tus datos de persona</h2>');
        } else {
            const idPersona = result.insertId;
            console.log('Persona insertada correctamente con ID:', idPersona);
            
            // Ahora insertar en la tabla CLIENTE con la contraseña
            const sqlCliente = 'INSERT INTO CLIENTE (id_persona, password) VALUES (?, ?)';
            
            db.query(sqlCliente, [idPersona, password], (err, resultCliente) => {
                if(err){
                    console.error('Error al insertar cliente:', err);
                    res.send('<h2>Hubo un error al crear el perfil de cliente</h2>');
                } else {
                    console.log('Cliente registrado correctamente con ID:', resultCliente.insertId);
                    res.send(`<h2>¡Gracias ${nombres}! Has sido registrado como cliente en la plataforma.</h2>
                        <p>Tu ID de cliente es: ${resultCliente.insertId}</p>
                        <p><a href="/">Volver al inicio</a></p>`);
                }
            });
        }
    });
});
    
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    // Primero verificar si es un empleado
    const sqlEmpleado = `
        SELECT e.id_empleado, p.nombres, p.apellidos, p.email
        FROM EMPLEADO e
        JOIN PERSONA p ON e.id_persona = p.id_persona
        WHERE p.email = ? AND e.password_hash = ?
    `;
    
    db.query(sqlEmpleado, [email, password], (err, resultEmpleado) => {
        if (err) {
            console.error('Error al consultar empleado:', err);
            return res.status(500).send('Hubo un error al consultar los datos');
        }
        
        if (resultEmpleado.length > 0) {
            // Es un empleado - redirigir a página con estilo
            const redirectUrl = `/redirect.html?name=${encodeURIComponent(resultEmpleado[0].nombres)}&type=empleado&redirect=${encodeURIComponent('/dashboard-empleado.html')}`;
            res.redirect(redirectUrl);
            return;
        }
        
        // Si no es empleado, verificar si es cliente
        const sqlCliente = `
            SELECT c.id_cliente, p.nombres, p.apellidos, p.email
            FROM CLIENTE c
            JOIN PERSONA p ON c.id_persona = p.id_persona
            WHERE p.email = ? AND c.password = ?
        `;
        
        db.query(sqlCliente, [email, password], (err, resultCliente) => {
            if (err) {
                console.error('Error al consultar cliente:', err);
                return res.status(500).send('Hubo un error al consultar los datos');
            }
            
            if (resultCliente.length > 0) {
                // Es un cliente - redirigir a página con estilo
                const redirectUrl = `/redirect.html?name=${encodeURIComponent(resultCliente[0].nombres)}&type=cliente&redirect=${encodeURIComponent('/dashboard-cliente.html')}`;
                res.redirect(redirectUrl);
            } else {
                // No se encontró ni como empleado ni como cliente
                res.status(401).send('<h2>Credenciales incorrectas</h2>');
            }
        });
    });
});

const GEN_ID_CLIENTE = 1; // Cambia si tienes otro cliente genérico

// INGRESO VEHÍCULO
app.post('/ingreso-vehiculo', express.json(), (req, res) => {
    const { placa, tipo_vehiculo } = req.body;
    if (!placa || !tipo_vehiculo) return res.json({ success: false, mensaje: 'Datos incompletos.' });
    // Buscar vehículo (por placa, único)
    db.query('SELECT id_vehiculo, estado FROM VEHICULO WHERE placa = ?', [placa], (err, rows) => {
        if (err) return res.json({ success: false, mensaje: 'Error al buscar vehículo.' });
        if (rows.length > 0 && rows[0].estado !== 'Inactivo') {
            // Ya existe vehículo activo, verificar si ya tiene ticket abierto
            const idVehiculo = rows[0].id_vehiculo;
            db.query('SELECT id_ticket FROM TICKET WHERE id_vehiculo = ? AND estado_ticket = "Activo" AND hora_salida IS NULL', [idVehiculo], (err, tickets) => {
                if (err) return res.json({ success: false, mensaje: 'Error verificando tickets activos.' });
                if (tickets.length > 0) {
                    return res.json({ success: false, mensaje: 'Este vehículo ya tiene ticket abierto.' });
                } else {
                    // Crear ticket
                    abrirTicket(req, res, idVehiculo, tipo_vehiculo, false);
                }
            });
        } else {
            // No existe el vehículo, crearlo (se asume cliente genérico)
            const sqlNuevo = 'INSERT INTO VEHICULO (placa, tipo_vehiculo, estado, id_cliente) VALUES (?, ?, "Activo", ?)';
            db.query(sqlNuevo, [placa, tipo_vehiculo, GEN_ID_CLIENTE], (err, result) => {
                if (err) {
                    return res.json({ success: false, mensaje: 'Error insertando vehículo.' });
                }
                const nuevoVehiculoId = result.insertId;
                abrirTicket(req, res, nuevoVehiculoId, tipo_vehiculo, true);
            });
        }
    });
});

function abrirTicket(req, res, idVehiculo, tipo_vehiculo, esNuevo) {
    // Obtener tarifa (la más barata que matchee el tipo, si no existe usa 1)
    db.query('SELECT id_tarifa, valor_unitario FROM TARIFA WHERE tipo_vehiculo = ? ORDER BY valor_unitario ASC LIMIT 1', [tipo_vehiculo], (err, tarifas) => {
        const idTarifa = tarifas && tarifas.length > 0 ? tarifas[0].id_tarifa : 1;
        const horaActual = new Date();
        // Por simplicidad, no asigna espacio ni empleado (deberías pasar id_empleado y espacio si lo tienes)
        db.query(
          'INSERT INTO TICKET (hora_entrada, id_vehiculo, id_tarifa) VALUES (?, ?, ?)',
          [horaActual, idVehiculo, idTarifa],
          (err, result) => {
            if (err) return res.json({ success: false, mensaje: 'Error creando ticket.' });
            return res.json({ 
                success: true, 
                mensaje: `Ingreso registrado exitosamente${esNuevo ? ' (vehículo creado)' : ''}.`,
                ticket: result.insertId
            });
          });
    });
}

// SALIDA VEHÍCULO
definirMontoYFacturar = (req, res, ticket, vehiculo, tarifa) => {
    const horaSalida = new Date();
    const horaEntrada = ticket.hora_entrada;
    const idTicket = ticket.id_ticket;
    // Calcular minutos (redondear hacia arriba)
    const msDiff = horaSalida - horaEntrada;
    let minutos = Math.ceil(msDiff / (1000 * 60));
    if (minutos <= 0) minutos = 1; // mínimo 1 minuto
    const valorUnitario = tarifa?.valor_unitario || 50;
    const montoTotal = minutos * valorUnitario;

    // Actualiza ticket
    db.query('UPDATE TICKET SET hora_salida = ?, monto_total = ?, estado_ticket = "Cerrado" WHERE id_ticket = ?', [horaSalida, montoTotal, idTicket], (err) => {
        if (err) {
            console.error('Error cerrando ticket:', err);
            return res.json({ success: false, mensaje: 'Error cerrando ticket.' });
        }
        
        // Primero verificar si existe método de pago, si no, crearlo
        db.query('SELECT id_metodo_pago FROM METODO_PAGO WHERE id_metodo_pago = 1', (err, metodoPago) => {
            if (err) {
                console.error('Error verificando método de pago:', err);
                return res.json({ success: false, mensaje: 'Error verificando método de pago.' });
            }
            
            let idMetodoPago = 1;
            
            // Si no existe el método de pago, crearlo
            if (metodoPago.length === 0) {
                db.query('INSERT INTO METODO_PAGO (tipo_metodo, referencia_pago) VALUES ("Efectivo", "Pago en efectivo")', (err, result) => {
                    if (err) {
                        console.error('Error creando método de pago:', err);
                        return res.json({ success: false, mensaje: 'Error creando método de pago.' });
                    }
                    idMetodoPago = result.insertId;
                    crearFactura();
                });
            } else {
                crearFactura();
            }
            
            function crearFactura() {
                db.query(
                    'INSERT INTO FACTURA (fecha_emision, valor_total, estado_factura, id_ticket, id_metodo_pago) VALUES (CURDATE(), ?, "Pendiente", ?, ?)',
                    [montoTotal, idTicket, idMetodoPago], (err, result) => {
                        if (err) {
                            console.error('Error generando factura:', err);
                            return res.json({ success: false, mensaje: 'Error generando factura: ' + err.message });
                        }
                        return res.json({
                            success: true,
                            mensaje: `Salida registrada y factura generada. (${minutos} minutos x $${valorUnitario}/minuto)` ,
                            valor_pagar: `$${montoTotal.toLocaleString()}`
                        });
                });
            }
        });
    });
}

app.post('/salida-vehiculo', express.json(), (req, res) => {
    const { placa } = req.body;
    if (!placa) return res.json({ success: false, mensaje: 'Debe ingresar la placa.' });
    db.query('SELECT id_vehiculo, tipo_vehiculo FROM VEHICULO WHERE placa = ?', [placa], (err, rows) => {
        if (err || rows.length === 0) return res.json({ success: false, mensaje: 'Vehículo no encontrado.' });
        const idVehiculo = rows[0].id_vehiculo;
        db.query('SELECT * FROM TICKET WHERE id_vehiculo = ? AND estado_ticket = "Activo" AND hora_salida IS NULL', [idVehiculo], (err, tickets) => {
            if (err || tickets.length === 0) return res.json({ success: false, mensaje: 'No hay ticket de ingreso abierto para esa placa.' });
            const ticket = tickets[0];
            // Buscar tarifa
            db.query('SELECT * FROM TARIFA WHERE id_tarifa = ?', [ticket.id_tarifa], (err, tarifas) => {
                const tarifa = tarifas && tarifas[0];
                definirMontoYFacturar(req, res, ticket, rows[0], tarifa);
            });
        });
    });
});

app.listen(PORT, () =>{
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});