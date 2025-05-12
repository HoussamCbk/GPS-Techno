# GPS-GSM-Firebase: Real-Time Location Tracking System

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Hardware Requirements](#hardware-requirements)
- [Software Requirements](#software-requirements)
- [Installation and Setup](#installation-and-setup)
- [Usage](#usage)

## Introduction
Dans le cadre du module de Technologie Automobile encadré par M. El Kebch Ali, ce projet porte sur la conception et la mise en œuvre d’un système de localisation GPS embarqué. L’objectif principal est de développer une solution fiable et autonome permettant de suivre en temps réel la position d’un véhicule à l’aide d’un microcontrôleur ESP8266 NodeMCU couplé à un module GPS. Pour assurer la transmission des données, un module GSM SIM800A est utilisé, garantissant la connectivité même en l’absence de Wi-Fi. Ce système envoie les coordonnées géographiques vers une base de données en ligne (Firebase Realtime Database), facilitant ainsi la visualisation et l’exploitation des données de localisation. Ce projet s’inscrit dans une démarche pédagogique visant à intégrer des compétences en électronique embarquée, communication sans fil, et programmation, tout en répondant aux enjeux actuels de la mobilité intelligente.

This project is part of the Automotive Technology module supervised by Mr. El Kebch Ali. It focuses on the design and implementation of an embedded GPS tracking system. The main objective is to develop a reliable and autonomous solution for real-time vehicle tracking using an ESP8266 NodeMCU microcontroller coupled with a GPS module. For data transmission, a SIM800A GSM module is used, ensuring connectivity even in the absence of Wi-Fi. The system sends geographic coordinates to an online database (Firebase Realtime Database), facilitating the visualization and exploitation of location data. This project is part of an educational approach aimed at integrating skills in embedded electronics, wireless communication, and programming, while addressing current challenges in smart mobility.

## Features
- Real-time GPS data acquisition
- GSM-based data transmission
- Cloud storage with Firebase
- Web dashboard for live location tracking
- Modular and extensible codebase

## System Architecture
```
[GPS Module] -- [Microcontroller] -- [GSM Module] -- [Firebase] -- [Web Dashboard]
```

## Hardware Requirements
- Microcontroller (e.g., NodeMCU ESP8266)
- GPS Module (e.g., NEO-6M)
- GSM Module (e.g., SIM800L)
- SIM Card with data plan
- Jumper wires, breadboard, power supply

## Software Requirements
- Arduino IDE
- Firebase account
- Web browser

## Installation and Setup
1. **Hardware Setup:**
   - Connect the GPS and GSM modules to the microcontroller as per their datasheets.
2. **Firmware Upload:**
   - Open `GPS-GSM-Firebase/GPS-GSM-Firebase.ino` in Arduino IDE.
   - Configure your Wi-Fi and Firebase credentials in the code.
   - Upload the code to your microcontroller.
3. **Web Dashboard:**
   - Navigate to the `Public` directory.
   - Open `index.html` in your browser to view the dashboard.

## Usage
- Power on the hardware setup.
- The device will send GPS data to Firebase.
- Access the web dashboard to monitor real-time location updates.


---
*Developed for academic and research purposes by Houssam CHOUBIK.*
