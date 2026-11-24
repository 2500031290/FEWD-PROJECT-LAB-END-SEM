# React + Node.js authentication (VS Code ready)

## Run (2 steps)
1. Open this folder in VS Code (File > Open Folder), then open a terminal (Terminal > New Terminal).
2. Run:
   npm run setup
   npm run dev

Then open http://localhost:5173

Shortcut: press Ctrl+Shift+B in VS Code to start both servers.
Do NOT use "Live Server" for this project.

- server/  Express API (register, login, refresh, logout, /api/me)
- client/  React (Vite) website
- server/.env already contains generated secrets. Make new ones before deploying.

Test on your phone (same Wi-Fi): http://<your-computer-IP>:5173
