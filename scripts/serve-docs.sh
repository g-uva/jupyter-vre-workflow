#!/bin/bash

stop_serve_docs() {
    docker stop jupyter-vre-workflow-docs 2>/dev/null && docker rm jupyter-vre-workflow-docs 2>/dev/null || true
    echo "jupyter-vre-workflow-docs stopped."
}

docker build -t jupyter-vre-workflow-docs ./doc
docker rm -f jupyter-vre-workflow-docs 2>/dev/null || true
docker run -d --name jupyter-vre-workflow-docs -p 3000:3000 --restart unless-stopped jupyter-vre-workflow-docs
