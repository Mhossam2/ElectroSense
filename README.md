# Smart Circuit Analyzer & Builder

An integrated hardware–software platform for automatic detection, analysis, and measurement of electronic components, combined with an interactive web application for circuit building and learning.

---

## 🚀 Overview
This project provides a complete solution for identifying electronic components (such as resistors, capacitors, inductors, diodes, BJTs, and MOSFETs), extracting their parameters, and visualizing results in real time through a browser-based interface.

It also enables users to design circuits virtually and map real-world components to their corresponding elements using intelligent matching.

---

## ✨ Features
- Automatic component detection (R, C, L, Diodes, BJTs, MOSFETs)
- Real-time measurement of:
  - Resistance, capacitance, inductance  
  - Voltage and frequency  
- DC power supply with current limiting  
- Function generator and PWM generator  
- Interactive circuit builder  
- Component matching with error analysis  
- Educational module (pinout, behavior, usage)

---

## 🏗️ System Architecture
- **Hardware Layer:** Handles component detection, signal generation, and measurements  
- **Communication Layer:** Transfers data between hardware and application (UART / WiFi / Bluetooth)  
- **Frontend:** Web application for visualization, control, and circuit building  

---

## 🧠 How It Works
1. User designs a circuit using the web app  
2. Components are placed on the hardware device  
3. The system measures and identifies each component  
4. The app matches measured components with circuit elements  
5. Error margins are displayed for validation  
6. User confirms correct components and completes the circuit  

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript  
- **Hardware:** (ESP32)  
- **Communication:** (UART / WiFi / Bluetooth)  
- **Concepts:** Embedded Systems, Signal Processing, Circuit Analysis  

---

## ⚙️ Getting Started

### Frontend
```bash
npm install
npm run dev
