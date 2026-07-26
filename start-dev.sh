#!/bin/bash
# Wrapper script to run the dev server
# Uses npx to find tsx in node_modules/.bin
exec npx tsx server.ts
