# Sineware TCP Buffer Managed Proxy
This is a simple TCP proxy that passes packets transparently to a backend server.

It is designed to be used to expose service at an edge, placing it somewhere with an efficient peering route between the backend and your clients.

Additionally, the proxy attempts to smooth-over latency issues, particularly with distant clients who may be experiencing buffer-related latency issues. It 
does this by detecting when packets are filling up in a buffer, and momentarily pauses the opposite connection to allow the buffer to drain. This works well with 
games such as Minecraft.

## Usage
Configure .env, then run docker-compose up.
