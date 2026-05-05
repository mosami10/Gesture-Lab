# GestureLab — Part 1 Starter

This is the first build of a single all-in-one gesture app.

## What is included
- One webcam system
- One MediaPipe Holistic tracker
- One full-screen canvas
- Mode switching UI
- Debug Tracking mode
- Air Drawer mode
- Hand Connect mode
- Placeholder cards for Particle Text and X-Ray Vision

## Run it
Because the project uses local JavaScript files and browser camera access, run it from a local server.

### Python
```bash
cd gesture-lab-part1
python3 -m http.server 8000
```

Then open:
```bash
http://localhost:8000
```

## Recommended next parts
- Part 2: improve Air Drawer and Hand Connect with better visuals and settings
- Part 3: build Particle Text and X-Ray Vision on top of the same engine
