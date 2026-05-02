#!/bin/bash
cd "$(dirname "$0")/backend"
uvicorn main:app --reload &
PID=$!
trap "kill $PID" EXIT
sleep 1
open http://localhost:8000
wait $PID
