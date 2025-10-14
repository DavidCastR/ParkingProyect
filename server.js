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

app.post('/registrar', (req,res) => {
    const {nombres, apellidos, email, password} = req.body;
    const sql = 'INSERT INTO users (nombres, apellidos,email,password) VALUES (?,?,?,?)';
    db.query(sql,[nombres, apellidos, email, password], (err, result) =>
    {
    if(err){
        console.error('Error al insertar:', err);
        res.send('Hubo un error al guardar tus datos');
    } else {
        console.log('Datos insertados correctamente.');
        res.send(`<h2> Gracias, $(nombre). has sido registrado en la plataforma.</h2>`);
    }
    });
    });
    
    app.post('/login', (req, res) => {
      const { email, password } = req.body;
      const sql = 'SELECT id, email FROM users WHERE email = ? AND password = ? AND id_empleado != NULL';
      db.query(sql, [email, password], (err, result) => {
        if (err) {
          console.error('Error al consultar los datos:', err);
          return res.status(500).send('Hubo un error al consultar tus datos');
        }
        if (result.length > 0) {
          res.send(`<h2>Bienvenido, vas a ser redireccionado a la página de gestión.</h2>
            <script>
              setTimeout(function() {
                window.location.href = "/consola_adm.html";
              }, 1000);
            </script>
            `);
        } else {
          res.status(401).send('<h2>Credenciales incorrectas</h2>');
        }
      });
    });

app.listen(PORT, () =>{
    console.log('Servidor escuchando en http://localhost:$(PORT)');
});