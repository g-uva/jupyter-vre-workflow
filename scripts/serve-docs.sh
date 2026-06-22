#!/bin/bash

stop_serve_docs() {
    docker stop ecojupyter-docs 2>/dev/null && docker rm ecojupyter-docs 2>/dev/null || true
    echo "ecojupyter-docs stopped."
}

docker build -t ecojupyter-docs ./doc
docker rm -f ecojupyter-docs 2>/dev/null || true
docker run -d --name ecojupyter-docs -p 3000:3000 --restart unless-stopped ecojupyter-docs
