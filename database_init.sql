-- Script de inicialización de la base de datos Parking
-- Ejecutar este script para crear las tablas necesarias

CREATE DATABASE IF NOT EXISTS parking;
USE parking;

-- Tabla PERSONA
CREATE TABLE IF NOT EXISTS PERSONA (
    id_persona INT PRIMARY KEY AUTO_INCREMENT,
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(60) NOT NULL,
    apellidos VARCHAR(60) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(80),
);

-- Tabla CLIENTE
CREATE TABLE IF NOT EXISTS CLIENTE (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    id_persona INT NOT NULL,
    password VARCHAR(255) NOT NULL
    CONSTRAINT FK_CLIENTE_PERSONA
        FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla EMPLEADO
CREATE TABLE IF NOT EXISTS EMPLEADO (
    id_empleado INT PRIMARY KEY AUTO_INCREMENT,
    id_persona INT NOT NULL,
    id_carnet VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT FK_EMPLEADO_PERSONA
        FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Tabla PARQUEADERO
CREATE TABLE IF NOT EXISTS PARQUEADERO (
    id_parqueadero INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    horario VARCHAR(50),
    capacidad_total INT,
    tipo_parqueadero VARCHAR(50)
);

-- Tabla ESPACIO_PARQUEO
CREATE TABLE IF NOT EXISTS ESPACIO_PARQUEO (
    id_espacio INT PRIMARY KEY AUTO_INCREMENT,
    numero_espacio VARCHAR(10) NOT NULL,
    tipo_espacio VARCHAR(30),
    estado VARCHAR(20) DEFAULT 'Disponible',
    id_parqueadero INT NOT NULL,
    CONSTRAINT FK_ESPACIO_PARQUEO_PARQUEADERO
        FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla PROVEEDOR
CREATE TABLE IF NOT EXISTS PROVEEDOR (
    id_proveedor INT PRIMARY KEY AUTO_INCREMENT,
    nombre_proveedor VARCHAR(100) NOT NULL,
    tipo_servicio VARCHAR(60),
    telefono VARCHAR(20),
    email VARCHAR(80),
    id_parqueadero INT NOT NULL,
    CONSTRAINT FK_PROVEEDOR_PARQUEADERO
        FOREIGN KEY (id_parqueadero) REFERENCES PARQUEADERO(id_parqueadero)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla VEHICULO
CREATE TABLE IF NOT EXISTS VEHICULO (
    id_vehiculo INT PRIMARY KEY AUTO_INCREMENT,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(40),
    modelo VARCHAR(40),
    tipo_vehiculo VARCHAR(30),
    color VARCHAR(20),
    año_modelo INT,
    estado VARCHAR(20) DEFAULT 'Activo',
    id_cliente INT NOT NULL,
    CONSTRAINT FK_VEHICULO_CLIENTE
        FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Tabla TARIFA
CREATE TABLE IF NOT EXISTS TARIFA (
    id_tarifa INT PRIMARY KEY AUTO_INCREMENT,
    tipo_tarifa VARCHAR(30) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    tipo_vehiculo VARCHAR(30)
);

-- Tabla TICKET
CREATE TABLE IF NOT EXISTS TICKET (
    id_ticket INT PRIMARY KEY AUTO_INCREMENT,
    hora_entrada DATETIME NOT NULL,
    hora_salida DATETIME,
    monto_total DECIMAL(10,2),
    estado_ticket VARCHAR(20) DEFAULT 'Activo',
    id_vehiculo INT NOT NULL,
    id_empleado INT,
    id_espacio INT,
    id_tarifa INT,
    CONSTRAINT FK_TICKET_VEHICULO
        FOREIGN KEY (id_vehiculo) REFERENCES VEHICULO(id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT FK_TICKET_EMPLEADO
        FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_empleado)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT FK_TICKET_ESPACIO_PARQUEO
        FOREIGN KEY (id_espacio) REFERENCES ESPACIO_PARQUEO(id_espacio)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT FK_TICKET_TARIFA
        FOREIGN KEY (id_tarifa) REFERENCES TARIFA(id_tarifa)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Tabla METODO_PAGO
CREATE TABLE IF NOT EXISTS METODO_PAGO (
    id_metodo_pago INT PRIMARY KEY AUTO_INCREMENT,
    tipo_metodo VARCHAR(30) NOT NULL,
    referencia_pago VARCHAR(100)
);

-- Tabla FACTURA
CREATE TABLE IF NOT EXISTS FACTURA (
    id_factura INT PRIMARY KEY AUTO_INCREMENT,
    fecha_emision DATE NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    estado_factura VARCHAR(20) DEFAULT 'Pendiente',
    id_ticket INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    CONSTRAINT FK_FACTURA_TICKET
        FOREIGN KEY (id_ticket) REFERENCES TICKET(id_ticket)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT FK_FACTURA_METODO_PAGO
        FOREIGN KEY (id_metodo_pago) REFERENCES METODO_PAGO(id_metodo_pago)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Insertar datos iniciales

-- Insertar parqueadero principal
INSERT INTO PARQUEADERO (nombre, direccion, horario, capacidad_total, tipo_parqueadero) VALUES
('Parqueadero Central', 'Calle 123 #45-67', '24 horas', 50, 'Mixto');

-- Insertar espacios de parqueo
INSERT INTO ESPACIO_PARQUEO (numero_espacio, tipo_espacio, estado, id_parqueadero) VALUES
('A01', 'Carro', 'Disponible', 1),
('A02', 'Carro', 'Disponible', 1),
('A03', 'Carro', 'Disponible', 1),
('A04', 'Carro', 'Disponible', 1),
('A05', 'Carro', 'Disponible', 1),
('B01', 'Moto', 'Disponible', 1),
('B02', 'Moto', 'Disponible', 1),
('B03', 'Moto', 'Disponible', 1),
('B04', 'Moto', 'Disponible', 1),
('B05', 'Moto', 'Disponible', 1),
('C01', 'Camioneta', 'Disponible', 1),
('C02', 'Camioneta', 'Disponible', 1),
('C03', 'Camioneta', 'Disponible', 1);

-- Insertar tarifas
INSERT INTO TARIFA (tipo_tarifa, valor_unitario, tipo_vehiculo) VALUES
('Por hora', 2000.00, 'Carro'),
('Por hora', 1000.00, 'Moto'),
('Por hora', 3000.00, 'Camioneta'),
('Por día', 15000.00, 'Carro'),
('Por día', 8000.00, 'Moto'),
('Por día', 20000.00, 'Camioneta');

-- Insertar métodos de pago
INSERT INTO METODO_PAGO (tipo_metodo, referencia_pago) VALUES
('Efectivo', 'Pago en efectivo'),
('Tarjeta', 'Pago con tarjeta'),
('Transferencia', 'Transferencia bancaria');

-- Mostrar mensaje de éxito
SELECT 'Base de datos inicializada correctamente' as mensaje;
