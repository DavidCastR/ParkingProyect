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
    
    // Verificar y agregar columna id_parqueadero a TICKET si no existe
    db.query(`SHOW COLUMNS FROM TICKET LIKE 'id_parqueadero'`, (err, result) => {
        if (err) {
            console.error('Error verificando columna id_parqueadero:', err);
        } else if (result.length === 0) {
            // La columna no existe, agregarla
            db.query(`ALTER TABLE TICKET ADD COLUMN id_parqueadero INT`, (err) => {
                if (err) {
                    console.error('Error agregando columna id_parqueadero:', err);
                } else {
                    console.log('Columna id_parqueadero agregada a la tabla TICKET');
                    // Agregar la foreign key
                    db.query(`ALTER TABLE TICKET ADD CONSTRAINT FK_TICKET_PARQUEADERO FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero) ON UPDATE CASCADE ON DELETE SET NULL`, (err2) => {
                        if (err2) {
                            console.error('Error agregando constraint FK_TICKET_PARQUEADERO:', err2);
                        } else {
                            console.log('Constraint FK_TICKET_PARQUEADERO agregada');
                        }
                    });
                }
            });
        }
    });
    
    // Verificar y agregar columna estado a PARQUEADERO si no existe
    db.query(`SHOW COLUMNS FROM PARQUEADERO LIKE 'estado'`, (err, result) => {
        if (err) {
            console.error('Error verificando columna estado:', err);
        } else if (result.length === 0) {
            // La columna no existe, agregarla
            db.query(`ALTER TABLE PARQUEADERO ADD COLUMN estado VARCHAR(20) DEFAULT 'Activo'`, (err) => {
                if (err) {
                    console.error('Error agregando columna estado:', err);
                } else {
                    console.log('Columna estado agregada a la tabla PARQUEADERO');
                }
            });
        }
    });
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

// OBTENER PARQUEADEROS (todos, para administración)
app.get('/obtener-parqueaderos', (req, res) => {
    db.query('SELECT id_parqueadero, nombre, direccion, horario, capacidad_total, tipo_parqueadero, COALESCE(estado, "Activo") as estado FROM PARQUEADERO ORDER BY nombre', (err, result) => {
        if (err) {
            console.error('Error obteniendo parqueaderos:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo parqueaderos.' });
        }
        return res.json({ success: true, parqueaderos: result });
    });
});

// OBTENER PARQUEADEROS ACTIVOS (para selector de ingreso/salida)
app.get('/obtener-parqueaderos-activos', (req, res) => {
    db.query('SELECT id_parqueadero, nombre, direccion, horario, capacidad_total, tipo_parqueadero FROM PARQUEADERO WHERE COALESCE(estado, "Activo") = "Activo" ORDER BY nombre', (err, result) => {
        if (err) {
            console.error('Error obteniendo parqueaderos activos:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo parqueaderos activos.' });
        }
        return res.json({ success: true, parqueaderos: result });
    });
});

// OBTENER PARQUEADERO POR ID
app.get('/obtener-parqueadero/:id', (req, res) => {
    const idParqueadero = req.params.id;
    db.query('SELECT id_parqueadero, nombre, direccion, horario, capacidad_total, tipo_parqueadero FROM PARQUEADERO WHERE id_parqueadero = ?', [idParqueadero], (err, result) => {
        if (err) {
            console.error('Error obteniendo parqueadero:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo parqueadero.' });
        }
        if (result.length === 0) {
            return res.json({ success: false, mensaje: 'Parqueadero no encontrado.' });
        }
        return res.json({ success: true, parqueadero: result[0] });
    });
});

// ESTADÍSTICAS DE PARQUEADERO
app.get('/estadisticas-parqueadero/:id', (req, res) => {
    const idParqueadero = req.params.id;
    // Contar tickets activos filtrados por id_parqueadero directamente en TICKET
    db.query(`
        SELECT COUNT(*) as vehiculosIngresados 
        FROM TICKET t
        WHERE t.estado_ticket = 'Activo' 
        AND t.hora_salida IS NULL
        AND t.id_parqueadero = ?
    `, [idParqueadero], (err, result) => {
        if (err) {
            // Si falla por columna inexistente, usar consulta alternativa con JOIN
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                console.log('Columna id_parqueadero no existe en TICKET, usando consulta alternativa...');
                db.query(`
                    SELECT COUNT(DISTINCT t.id_ticket) as vehiculosIngresados 
                    FROM TICKET t
                    LEFT JOIN ESPACIO_PARQUEO ep ON t.id_espacio = ep.id_espacio
                    WHERE t.estado_ticket = 'Activo' 
                    AND t.hora_salida IS NULL
                    AND ep.id_parqueadero = ?
                `, [idParqueadero], (err2, result2) => {
                    if (err2) {
                        console.error('Error obteniendo estadísticas:', err2);
                        return res.json({ success: false, mensaje: 'Error obteniendo estadísticas.' });
                    }
                    return res.json({ success: true, vehiculosIngresados: result2[0].vehiculosIngresados || 0 });
                });
            } else {
                console.error('Error obteniendo estadísticas:', err);
                return res.json({ success: false, mensaje: 'Error obteniendo estadísticas.' });
            }
        } else {
            return res.json({ success: true, vehiculosIngresados: result[0].vehiculosIngresados || 0 });
        }
    });
});

// INGRESO VEHÍCULO
app.post('/ingreso-vehiculo', express.json(), (req, res) => {
    const { placa, tipo_vehiculo, id_parqueadero } = req.body;
    if (!placa || !tipo_vehiculo || !id_parqueadero) return res.json({ success: false, mensaje: 'Datos incompletos. Debe seleccionar un parqueadero.' });
    
    // Verificar que el parqueadero existe
    db.query('SELECT nombre, direccion, capacidad_total FROM PARQUEADERO WHERE id_parqueadero = ?', [id_parqueadero], (err, parqueadero) => {
        if (err || parqueadero.length === 0) {
            return res.json({ success: false, mensaje: 'Parqueadero no encontrado.' });
        }
        
        // Buscar vehículo (por placa, único)
        db.query('SELECT id_vehiculo, estado FROM VEHICULO WHERE placa = ?', [placa], (err, rows) => {
            if (err) return res.json({ success: false, mensaje: 'Error al buscar vehículo.' });
            if (rows.length > 0 && rows[0].estado !== 'Inactivo') {
                // Ya existe vehículo activo, verificar si ya tiene ticket abierto en este parqueadero
                const idVehiculo = rows[0].id_vehiculo;
                db.query('SELECT id_ticket FROM TICKET WHERE id_vehiculo = ? AND estado_ticket = "Activo" AND hora_salida IS NULL', [idVehiculo], (err, tickets) => {
                    if (err) return res.json({ success: false, mensaje: 'Error verificando tickets activos.' });
                    if (tickets.length > 0) {
                        return res.json({ success: false, mensaje: 'Este vehículo ya tiene ticket abierto.' });
                    } else {
                        // Crear ticket
                        abrirTicket(req, res, idVehiculo, tipo_vehiculo, false, id_parqueadero, parqueadero[0]);
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
                    abrirTicket(req, res, nuevoVehiculoId, tipo_vehiculo, true, id_parqueadero, parqueadero[0]);
                });
            }
        });
    });
});

function abrirTicket(req, res, idVehiculo, tipo_vehiculo, esNuevo, id_parqueadero, parqueadero) {
    // Obtener tarifa (la más barata que matchee el tipo, si no existe usa 1)
    db.query('SELECT id_tarifa, valor_unitario FROM TARIFA WHERE tipo_vehiculo = ? ORDER BY valor_unitario ASC LIMIT 1', [tipo_vehiculo], (err, tarifas) => {
        const idTarifa = tarifas && tarifas.length > 0 ? tarifas[0].id_tarifa : 1;
        const horaActual = new Date();
        
        // Insertar ticket con id_parqueadero
        const sqlInsert = 'INSERT INTO TICKET (hora_entrada, id_vehiculo, id_tarifa, id_parqueadero) VALUES (?, ?, ?, ?)';
        db.query(sqlInsert, [horaActual, idVehiculo, idTarifa, id_parqueadero], (err, result) => {
            if (err) {
                console.error('Error creando ticket:', err);
                // Si falla por columna inexistente, intentar sin id_parqueadero
                if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                    console.log('Columna id_parqueadero no existe, insertando sin ella...');
                    db.query('INSERT INTO TICKET (hora_entrada, id_vehiculo, id_tarifa) VALUES (?, ?, ?)', [horaActual, idVehiculo, idTarifa], (err2, result2) => {
                        if (err2) {
                            console.error('Error creando ticket (sin parqueadero):', err2);
                            return res.json({ success: false, mensaje: 'Error creando ticket.' });
                        }
                        // Actualizar después si es posible
                        return enviarRespuestaTicket(req, res, result2.insertId, tipo_vehiculo, horaActual, parqueadero, esNuevo);
                    });
                } else {
                    return res.json({ success: false, mensaje: 'Error creando ticket.' });
                }
            } else {
                return enviarRespuestaTicket(req, res, result.insertId, tipo_vehiculo, horaActual, parqueadero, esNuevo);
            }
        });
    });
}

function enviarRespuestaTicket(req, res, ticketId, tipo_vehiculo, horaActual, parqueadero, esNuevo) {
    const ticketUrl = `/ticket.html?ticket=${ticketId}&placa=${req.body.placa}&tipo=${tipo_vehiculo}&hora=${horaActual.toLocaleTimeString()}&fecha=${horaActual.toLocaleDateString()}&parqueadero=${encodeURIComponent(parqueadero.nombre)}&direccion=${encodeURIComponent(parqueadero.direccion)}`;
    
    return res.json({ 
        success: true, 
        mensaje: `Ingreso registrado exitosamente${esNuevo ? ' (vehículo creado)' : ''}.`,
        ticket: ticketId,
        ticketUrl: ticketUrl
    });
}

// SALIDA VEHÍCULO
definirMontoYFacturar = (req, res, ticket, vehiculo, tarifa, parqueadero) => {
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
                        // Generar URL para ver la factura
                        const placaFactura = vehiculo.placa || req.body.placa; // Usar placa de BD o del request como respaldo
                        console.log('Placa para factura:', placaFactura, 'Vehiculo objeto:', vehiculo);
                        const facturaUrl = `/factura.html?factura=${result.insertId}&ticket=${idTicket}&placa=${placaFactura}&tipo=${vehiculo.tipo_vehiculo}&horaIngreso=${horaEntrada.toLocaleTimeString()}&horaSalida=${horaSalida.toLocaleTimeString()}&tiempo=${minutos} minutos&tarifa=$${valorUnitario}/min&total=$${montoTotal.toLocaleString()}&fecha=${horaSalida.toLocaleDateString()}&parqueadero=${encodeURIComponent(parqueadero.nombre)}&direccion=${encodeURIComponent(parqueadero.direccion)}`;
                        
                        return res.json({
                            success: true,
                            mensaje: `Salida registrada y factura generada. (${minutos} minutos x $${valorUnitario}/minuto)` ,
                            valor_pagar: `$${montoTotal.toLocaleString()}`,
                            facturaUrl: facturaUrl
                        });
                });
            }
        });
    });
}

app.post('/salida-vehiculo', express.json(), (req, res) => {
    const { placa, id_parqueadero } = req.body;
    if (!placa) return res.json({ success: false, mensaje: 'Debe ingresar la placa.' });
    if (!id_parqueadero) return res.json({ success: false, mensaje: 'Debe seleccionar un parqueadero.' });
    
    // Obtener información del parqueadero
    db.query('SELECT nombre, direccion FROM PARQUEADERO WHERE id_parqueadero = ?', [id_parqueadero], (err, parqueadero) => {
        if (err || parqueadero.length === 0) {
            return res.json({ success: false, mensaje: 'Parqueadero no encontrado.' });
        }
        
        db.query('SELECT id_vehiculo, tipo_vehiculo, placa FROM VEHICULO WHERE placa = ?', [placa], (err, rows) => {
            if (err || rows.length === 0) return res.json({ success: false, mensaje: 'Vehículo no encontrado.' });
            const idVehiculo = rows[0].id_vehiculo;
            db.query('SELECT * FROM TICKET WHERE id_vehiculo = ? AND estado_ticket = "Activo" AND hora_salida IS NULL', [idVehiculo], (err, tickets) => {
                if (err || tickets.length === 0) return res.json({ success: false, mensaje: 'No hay ticket de ingreso abierto para esa placa.' });
                const ticket = tickets[0];
                // Buscar tarifa
                db.query('SELECT * FROM TARIFA WHERE id_tarifa = ?', [ticket.id_tarifa], (err, tarifas) => {
                    const tarifa = tarifas && tarifas[0];
                    definirMontoYFacturar(req, res, ticket, rows[0], tarifa, parqueadero[0]);
                });
            });
        });
    });
});

// OBTENER VEHÍCULOS INGRESADOS
app.get('/vehiculos-ingresados', (req, res) => {
    // Primero intentar con id_parqueadero directo en TICKET
    db.query(`
        SELECT 
            t.id_ticket,
            t.hora_entrada,
            v.placa,
            v.tipo_vehiculo,
            v.marca,
            v.modelo,
            v.color,
            COALESCE(p1.nombre, p2.nombre) as nombre_parqueadero,
            COALESCE(p1.direccion, p2.direccion) as direccion_parqueadero,
            TIMESTAMPDIFF(MINUTE, t.hora_entrada, NOW()) as minutos_estacionado
        FROM TICKET t
        INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
        LEFT JOIN PARQUEADERO p1 ON t.id_parqueadero = p1.id_parqueadero
        LEFT JOIN ESPACIO_PARQUEO ep ON t.id_espacio = ep.id_espacio
        LEFT JOIN PARQUEADERO p2 ON ep.id_parqueadero = p2.id_parqueadero
        WHERE t.estado_ticket = 'Activo' 
        AND t.hora_salida IS NULL
        ORDER BY t.hora_entrada DESC
    `, (err, result) => {
        if (err) {
            // Si falla por columna inexistente, usar consulta alternativa
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                console.log('Columna id_parqueadero no existe en TICKET, usando consulta alternativa...');
                db.query(`
                    SELECT 
                        t.id_ticket,
                        t.hora_entrada,
                        v.placa,
                        v.tipo_vehiculo,
                        v.marca,
                        v.modelo,
                        v.color,
                        p.nombre as nombre_parqueadero,
                        p.direccion as direccion_parqueadero,
                        TIMESTAMPDIFF(MINUTE, t.hora_entrada, NOW()) as minutos_estacionado
                    FROM TICKET t
                    INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
                    LEFT JOIN ESPACIO_PARQUEO ep ON t.id_espacio = ep.id_espacio
                    LEFT JOIN PARQUEADERO p ON ep.id_parqueadero = p.id_parqueadero
                    WHERE t.estado_ticket = 'Activo' 
                    AND t.hora_salida IS NULL
                    ORDER BY t.hora_entrada DESC
                `, (err2, result2) => {
                    if (err2) {
                        console.error('Error obteniendo vehículos ingresados:', err2);
                        return res.json({ success: false, mensaje: 'Error obteniendo vehículos ingresados.' });
                    }
                    return res.json({ success: true, vehiculos: result2 });
                });
            } else {
                console.error('Error obteniendo vehículos ingresados:', err);
                return res.json({ success: false, mensaje: 'Error obteniendo vehículos ingresados.' });
            }
        } else {
            return res.json({ success: true, vehiculos: result });
        }
    });
});

// REGISTRAR/MODIFICAR PARQUEADERO
app.post('/registrar-parqueadero', express.json(), (req, res) => {
    const { id, nombre, horario, capacidad, direccion, tipo, idEdit } = req.body;
    
    if (!nombre || !direccion || !capacidad || !tipo) {
        return res.json({ success: false, mensaje: 'Datos incompletos. Faltan campos requeridos.' });
    }

    // Si hay idEdit, es una modificación
    if (idEdit) {
        const sqlUpdate = 'UPDATE PARQUEADERO SET nombre = ?, direccion = ?, horario = ?, capacidad_total = ?, tipo_parqueadero = ? WHERE id_parqueadero = ?';
        db.query(sqlUpdate, [nombre, direccion, horario || null, capacidad, tipo, idEdit], (err, result) => {
            if (err) {
                console.error('Error actualizando parqueadero:', err);
                return res.json({ success: false, mensaje: 'Error actualizando parqueadero.' });
            }
            return res.json({ success: true, mensaje: 'Parqueadero actualizado correctamente.' });
        });
        return;
    }

    // Verificar si el ID ya existe (si se proporciona)
    if (id) {
        db.query('SELECT id_parqueadero FROM PARQUEADERO WHERE id_parqueadero = ?', [id], (err, result) => {
            if (err) {
                console.error('Error verificando parqueadero:', err);
                return res.json({ success: false, mensaje: 'Error verificando parqueadero.' });
            }
            
            if (result.length > 0) {
                return res.json({ success: false, mensaje: 'Ya existe un parqueadero con ese ID. Use la opción modificar.' });
            } else {
                // Insertar nuevo parqueadero con ID específico
                const sqlInsert = 'INSERT INTO PARQUEADERO (id_parqueadero, nombre, direccion, horario, capacidad_total, tipo_parqueadero, estado) VALUES (?, ?, ?, ?, ?, ?, "Activo")';
                db.query(sqlInsert, [id, nombre, direccion, horario || null, capacidad, tipo], (err, result) => {
                    if (err) {
                        console.error('Error insertando parqueadero:', err);
                        return res.json({ success: false, mensaje: 'Error registrando parqueadero. El ID puede estar duplicado.' });
                    }
                    return res.json({ success: true, mensaje: 'Parqueadero registrado correctamente.' });
                });
            }
        });
    } else {
        // Insertar nuevo parqueadero sin ID (auto-increment)
        const sqlInsert = 'INSERT INTO PARQUEADERO (nombre, direccion, horario, capacidad_total, tipo_parqueadero, estado) VALUES (?, ?, ?, ?, ?, "Activo")';
        db.query(sqlInsert, [nombre, direccion, horario || null, capacidad, tipo], (err, result) => {
            if (err) {
                console.error('Error insertando parqueadero:', err);
                return res.json({ success: false, mensaje: 'Error registrando parqueadero.' });
            }
            return res.json({ success: true, mensaje: 'Parqueadero registrado correctamente.' });
        });
    }
});

// INHABILITAR/HABILITAR PARQUEADERO
app.post('/cambiar-estado-parqueadero', express.json(), (req, res) => {
    const { id_parqueadero, estado } = req.body;
    
    if (!id_parqueadero || !estado) {
        return res.json({ success: false, mensaje: 'Datos incompletos.' });
    }
    
    db.query('UPDATE PARQUEADERO SET estado = ? WHERE id_parqueadero = ?', [estado, id_parqueadero], (err, result) => {
        if (err) {
            console.error('Error cambiando estado del parqueadero:', err);
            return res.json({ success: false, mensaje: 'Error cambiando estado del parqueadero.' });
        }
        const accion = estado === 'Inactivo' ? 'inhabilitado' : 'habilitado';
        return res.json({ success: true, mensaje: `Parqueadero ${accion} correctamente.` });
    });
});

// ESTADÍSTICAS DE ESPACIOS OCUPADOS POR PARQUEADERO
app.get('/estadisticas-espacios-ocupados', (req, res) => {
    // Obtener todos los parqueaderos activos
    db.query(`
        SELECT 
            p.id_parqueadero,
            p.nombre,
            p.direccion,
            p.capacidad_total,
            COALESCE(p.estado, 'Activo') as estado
        FROM PARQUEADERO p
        WHERE COALESCE(p.estado, 'Activo') = 'Activo'
        ORDER BY p.nombre
    `, (err, parqueaderos) => {
        if (err) {
            console.error('Error obteniendo parqueaderos:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo parqueaderos.' });
        }

        if (parqueaderos.length === 0) {
            return res.json({ success: true, estadisticas: [] });
        }

        const estadisticas = [];
        let procesados = 0;

        parqueaderos.forEach((parqueadero) => {
            // Obtener estadísticas por tipo de vehículo para este parqueadero
            db.query(`
                SELECT 
                    v.tipo_vehiculo,
                    COUNT(*) as cantidad
                FROM TICKET t
                INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
                WHERE t.estado_ticket = 'Activo' 
                AND t.hora_salida IS NULL
                AND t.id_parqueadero = ?
                GROUP BY v.tipo_vehiculo
            `, [parqueadero.id_parqueadero], (err, porTipo) => {
                if (err) {
                    console.error('Error obteniendo estadísticas por tipo:', err);
                    porTipo = [];
                }

                // Contar total de espacios ocupados
                db.query(`
                    SELECT COUNT(*) as total_ocupados
                    FROM TICKET t
                    WHERE t.estado_ticket = 'Activo' 
                    AND t.hora_salida IS NULL
                    AND t.id_parqueadero = ?
                `, [parqueadero.id_parqueadero], (err, total) => {
                    if (err) {
                        console.error('Error obteniendo total ocupados:', err);
                        total = [{ total_ocupados: 0 }];
                    }

                    const totalOcupados = total[0].total_ocupados || 0;
                    const capacidadTotal = parqueadero.capacidad_total || 0;
                    const disponibles = Math.max(0, capacidadTotal - totalOcupados);
                    const porcentajeOcupacion = capacidadTotal > 0 
                        ? ((totalOcupados / capacidadTotal) * 100).toFixed(1) 
                        : 0;

                    // Organizar por tipo de vehículo
                    const porTipoMap = {};
                    porTipo.forEach(item => {
                        porTipoMap[item.tipo_vehiculo] = item.cantidad;
                    });

                    estadisticas.push({
                        id_parqueadero: parqueadero.id_parqueadero,
                        nombre: parqueadero.nombre,
                        direccion: parqueadero.direccion,
                        capacidad_total: capacidadTotal,
                        total_ocupados: totalOcupados,
                        disponibles: disponibles,
                        porcentaje_ocupacion: parseFloat(porcentajeOcupacion),
                        por_tipo: {
                            Automovil: porTipoMap['Automovil'] || 0,
                            Motocicleta: porTipoMap['Motocicleta'] || 0,
                            Camion: porTipoMap['Camion'] || 0,
                            Bicicleta: porTipoMap['Bicicleta'] || 0
                        }
                    });

                    procesados++;
                    if (procesados === parqueaderos.length) {
                        return res.json({ success: true, estadisticas: estadisticas });
                    }
                });
            });
        });
    });
});

// OBTENER TARIFAS
app.get('/obtener-tarifas', (req, res) => {
    db.query('SELECT id_tarifa, tipo_tarifa, tipo_vehiculo, valor_unitario FROM TARIFA ORDER BY tipo_vehiculo, valor_unitario', (err, result) => {
        if (err) {
            console.error('Error obteniendo tarifas:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo tarifas.' });
        }
        return res.json({ success: true, tarifas: result });
    });
});

// OBTENER TARIFA POR ID
app.get('/obtener-tarifa/:id', (req, res) => {
    const idTarifa = req.params.id;
    db.query('SELECT id_tarifa, tipo_tarifa, tipo_vehiculo, valor_unitario FROM TARIFA WHERE id_tarifa = ?', [idTarifa], (err, result) => {
        if (err) {
            console.error('Error obteniendo tarifa:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo tarifa.' });
        }
        if (result.length === 0) {
            return res.json({ success: false, mensaje: 'Tarifa no encontrada.' });
        }
        return res.json({ success: true, tarifa: result[0] });
    });
});

// REGISTRAR/MODIFICAR TARIFA
app.post('/registrar-tarifa', express.json(), (req, res) => {
    const { tipo_tarifa, tipo_vehiculo, valor_unitario, idEdit } = req.body;
    
    if (!tipo_tarifa || !tipo_vehiculo || valor_unitario === undefined || valor_unitario === null) {
        return res.json({ success: false, mensaje: 'Datos incompletos. Faltan campos requeridos.' });
    }

    // Si hay idEdit, es una modificación
    if (idEdit) {
        const sqlUpdate = 'UPDATE TARIFA SET tipo_tarifa = ?, tipo_vehiculo = ?, valor_unitario = ? WHERE id_tarifa = ?';
        db.query(sqlUpdate, [tipo_tarifa, tipo_vehiculo, valor_unitario, idEdit], (err, result) => {
            if (err) {
                console.error('Error actualizando tarifa:', err);
                return res.json({ success: false, mensaje: 'Error actualizando tarifa.' });
            }
            return res.json({ success: true, mensaje: 'Tarifa actualizada correctamente.' });
        });
        return;
    }

    // Insertar nueva tarifa
    const sqlInsert = 'INSERT INTO TARIFA (tipo_tarifa, tipo_vehiculo, valor_unitario) VALUES (?, ?, ?)';
    db.query(sqlInsert, [tipo_tarifa, tipo_vehiculo, valor_unitario], (err, result) => {
        if (err) {
            console.error('Error insertando tarifa:', err);
            return res.json({ success: false, mensaje: 'Error registrando tarifa.' });
        }
        return res.json({ success: true, mensaje: 'Tarifa registrada correctamente.' });
    });
});

// ESTADÍSTICAS DE FACTURACIÓN
app.get('/estadisticas-facturacion', (req, res) => {
    const { fechaInicio, fechaFin, idParqueadero } = req.query;
    
    let fechaInicioSQL = fechaInicio || 'DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    let fechaFinSQL = fechaFin || 'CURDATE()';
    
    if (fechaInicio) fechaInicioSQL = `'${fechaInicio}'`;
    if (fechaFin) fechaFinSQL = `'${fechaFin}'`;
    
    let whereParqueadero = '';
    if (idParqueadero) {
        whereParqueadero = `AND t.id_parqueadero = ${idParqueadero}`;
    }

    // Resumen general
    db.query(`
        SELECT 
            COALESCE(SUM(f.valor_total), 0) as total,
            COUNT(DISTINCT f.id_factura) as total_facturas,
            COUNT(DISTINCT DATE(f.fecha_emision)) as dias_con_facturas
        FROM FACTURA f
        INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
        WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
        AND DATE(f.fecha_emision) <= ${fechaFinSQL}
        ${whereParqueadero}
    `, (err, resumen) => {
        if (err) {
            console.error('Error obteniendo resumen:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo resumen.' });
        }

        const total = parseFloat(resumen[0].total || 0);
        const totalFacturas = resumen[0].total_facturas || 0;
        const diasConFacturas = resumen[0].dias_con_facturas || 1;
        const promedioDiario = total / diasConFacturas;

        // Mejor día
        db.query(`
            SELECT 
                DATE(f.fecha_emision) as fecha,
                SUM(f.valor_total) as total_dia
            FROM FACTURA f
            INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
            WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
            AND DATE(f.fecha_emision) <= ${fechaFinSQL}
            ${whereParqueadero}
            GROUP BY DATE(f.fecha_emision)
            ORDER BY total_dia DESC
            LIMIT 1
        `, (err, mejorDia) => {
            if (err) {
                console.error('Error obteniendo mejor día:', err);
            }

            const mejorDiaStr = mejorDia && mejorDia.length > 0 
                ? `${mejorDia[0].fecha} ($${parseFloat(mejorDia[0].total_dia).toLocaleString('es-CO')})`
                : '-';

            // Ganancias por día
            db.query(`
                SELECT 
                    DATE(f.fecha_emision) as fecha,
                    SUM(f.valor_total) as total
                FROM FACTURA f
                INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
                WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
                AND DATE(f.fecha_emision) <= ${fechaFinSQL}
                ${whereParqueadero}
                GROUP BY DATE(f.fecha_emision)
                ORDER BY fecha ASC
            `, (err, porDia) => {
                if (err) {
                    console.error('Error obteniendo ganancias por día:', err);
                    return res.json({ success: false, mensaje: 'Error obteniendo datos.' });
                }

                // Ganancias por parqueadero
                db.query(`
                    SELECT 
                        COALESCE(p.nombre, 'Sin parqueadero') as nombre_parqueadero,
                        SUM(f.valor_total) as total
                    FROM FACTURA f
                    INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
                    LEFT JOIN PARQUEADERO p ON t.id_parqueadero = p.id_parqueadero
                    WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
                    AND DATE(f.fecha_emision) <= ${fechaFinSQL}
                    ${whereParqueadero}
                    GROUP BY t.id_parqueadero, p.nombre
                    ORDER BY total DESC
                `, (err, porParqueadero) => {
                    if (err) {
                        console.error('Error obteniendo ganancias por parqueadero:', err);
                        return res.json({ success: false, mensaje: 'Error obteniendo datos.' });
                    }

                    // Ganancias por tipo de vehículo
                    db.query(`
                        SELECT 
                            COALESCE(v.tipo_vehiculo, 'Desconocido') as tipo_vehiculo,
                            SUM(f.valor_total) as total
                        FROM FACTURA f
                        INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
                        INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
                        WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
                        AND DATE(f.fecha_emision) <= ${fechaFinSQL}
                        ${whereParqueadero}
                        GROUP BY v.tipo_vehiculo
                        ORDER BY total DESC
                    `, (err, porTipoVehiculo) => {
                        if (err) {
                            console.error('Error obteniendo ganancias por tipo:', err);
                            return res.json({ success: false, mensaje: 'Error obteniendo datos.' });
                        }

                        // Facturas detalladas
                        db.query(`
                            SELECT 
                                f.id_factura,
                                f.fecha_emision,
                                f.valor_total,
                                f.estado_factura,
                                COALESCE(p.nombre, 'Sin parqueadero') as nombre_parqueadero,
                                v.placa,
                                v.tipo_vehiculo
                            FROM FACTURA f
                            INNER JOIN TICKET t ON f.id_ticket = t.id_ticket
                            LEFT JOIN PARQUEADERO p ON t.id_parqueadero = p.id_parqueadero
                            INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
                            WHERE DATE(f.fecha_emision) >= ${fechaInicioSQL}
                            AND DATE(f.fecha_emision) <= ${fechaFinSQL}
                            ${whereParqueadero}
                            ORDER BY f.fecha_emision DESC, f.id_factura DESC
                            LIMIT 100
                        `, (err, facturas) => {
                            if (err) {
                                console.error('Error obteniendo facturas:', err);
                                return res.json({ success: false, mensaje: 'Error obteniendo facturas.' });
                            }

                            // Formatear datos para gráficos
                            const graficos = {
                                porDia: {
                                    labels: porDia.map(d => {
                                        const fecha = new Date(d.fecha);
                                        return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
                                    }),
                                    valores: porDia.map(d => parseFloat(d.total || 0))
                                },
                                porParqueadero: {
                                    labels: porParqueadero.map(p => p.nombre_parqueadero),
                                    valores: porParqueadero.map(p => parseFloat(p.total || 0))
                                },
                                porTipoVehiculo: {
                                    labels: porTipoVehiculo.map(t => {
                                        const tipos = {
                                            'Automovil': 'Automóvil',
                                            'Motocicleta': 'Motocicleta',
                                            'Camion': 'Camión',
                                            'Bicicleta': 'Bicicleta'
                                        };
                                        return tipos[t.tipo_vehiculo] || t.tipo_vehiculo;
                                    }),
                                    valores: porTipoVehiculo.map(t => parseFloat(t.total || 0))
                                }
                            };

                            return res.json({
                                success: true,
                                resumen: {
                                    total: total,
                                    promedioDiario: promedioDiario,
                                    totalFacturas: totalFacturas,
                                    mejorDia: mejorDiaStr
                                },
                                graficos: graficos,
                                facturas: facturas
                            });
                        });
                    });
                });
            });
        });
    });
});

// OBTENER TICKETS
app.get('/obtener-tickets', (req, res) => {
    const { estado, idParqueadero, placa } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    if (estado) {
        whereConditions.push('t.estado_ticket = ?');
        params.push(estado);
    }
    
    if (idParqueadero) {
        whereConditions.push('t.id_parqueadero = ?');
        params.push(idParqueadero);
    }
    
    if (placa) {
        whereConditions.push('v.placa LIKE ?');
        params.push(`%${placa}%`);
    }
    
    const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';
    
    const query = `
        SELECT 
            t.id_ticket,
            t.hora_entrada,
            t.hora_salida,
            t.monto_total,
            t.estado_ticket,
            v.placa,
            v.tipo_vehiculo,
            COALESCE(p.nombre, 'Sin parqueadero') as nombre_parqueadero
        FROM TICKET t
        INNER JOIN VEHICULO v ON t.id_vehiculo = v.id_vehiculo
        LEFT JOIN PARQUEADERO p ON t.id_parqueadero = p.id_parqueadero
        ${whereClause}
        ORDER BY t.hora_entrada DESC
        LIMIT 500
    `;
    
    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error obteniendo tickets:', err);
            return res.json({ success: false, mensaje: 'Error obteniendo tickets.' });
        }
        return res.json({ success: true, tickets: result });
    });
});

app.listen(PORT, () =>{
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});