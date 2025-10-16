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

app.listen(PORT, () =>{
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});