
**TorLink-Spanish** es un fork localizado y adaptado a la comunidad hispanohablante de [TorLink](https://github.com/baairon/torlink), el elegante buscador y descargador de torrents que vive directamente en tu terminal, con cero configuración y sin servidores intermedios.

El objetivo de este repositorio es traducir la interfaz, adaptar los mensajes del sistema y priorizar/optimizar indexadores y trackers populares en español (como DonTorrent), manteniendo la esencia minimalista y rápida del proyecto original.

## ✨ Características Principales
* **🔍 Búsqueda Unificada:** Busca en múltiples fuentes curadas al mismo tiempo (Películas, Series, Anime, Juegos).
* **💻 Interfaz de Terminal (TUI):** Navegación intuitiva con atajos de teclado, sin necesidad de usar el ratón.
* **🌐 Fuentes en Español:** Soporte nativo y priorizado para indexadores hispanos.
* **⚙️ Modos Headless (Sin interfaz):** Ideal para servidores, NAS o seedboxes (`watch`, `serve`, `files`).
* **🔒 Privacidad y P2P:** Tus archivos se quedan en tu disco. No hay servidores centrales ni telemetría.
* **🌱 Seeding Automático:** Al terminar de descargar, el cliente sigue compartiendo el archivo para mantener viva la red.

## 🛠️ ¿Por qué este Fork?
Este repositorio nace para:
1. **Romper la barrera del idioma:** Llevar la experiencia de TorLink a usuarios de habla hispana.
2. **Adaptación Regional:** Mejorar la integración con trackers y comunidades de torrents en español.
3. **Desarrollo Asistido por IA:** Servir como base de trabajo para experimentar y mejorar el código utilizando herramientas como Qwen Coder.

## 🚀 Inicio Rápido
*(Requiere Node.js v22 o superior)*

```bash
npx torlnk

---
### 3. Etiquetas / Topics sugeridos para GitHub
Para que tu repositorio sea fácil de encontrar, añade estas etiquetas en la sección "Topics" de tu repo:

`torrent` `torrent-client` `terminal` `tui` `cli` `ink` `webtorrent` `spanish` `espanol` `downloader` `magnet-links` `p2p`

---

**💡 Un consejo para cuando empieces a usar Qwen Coder en este nuevo repo:**
Como el código original está en inglés (por ejemplo, los mensajes en `src/ui/components/Downloads.tsx` o `src/cli/args.ts`), tu primer *prompt* con Qwen Coder podría ser algo como: 
> *"Actúa como un desarrollador experto en React/Ink. Vamos a empezar a internacionalizar (i18n) este proyecto. Crea un archivo de diccionario en español y refactoriza `src/ui/keymap.ts` y `src/cli/args.ts` para que usen estas traducciones en lugar de tener los strings en inglés hardcodeados."* 

¿Te ayudo a preparar el primer prompt o comando para empezar a trabajar en el código?
