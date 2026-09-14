// Production worker boundary. Install Playwright, BullMQ, Remotion and the storage adapter here.
// This process must be separate from the web server on shared hosting.
import 'dotenv/config';
console.log('ZoomCue worker booted. Configure Redis/BullMQ and Playwright adapters before accepting production jobs.');
console.log('Stages: explore -> write_script -> dry_run -> narrate -> record -> camera_audit -> render -> done');
