// Vercel entrypoint for the ZoomCue web/API layer.
// Long-running Playwright and Remotion jobs must run in the external worker service.
import app from '../production-server.js';
export default app;
