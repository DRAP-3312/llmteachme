#!/bin/bash
set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment process...${NC}"

# Verificar que estamos en un repositorio git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    exit 1
fi

# Obtener información de la versión
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${GIT_COMMIT}-${TIMESTAMP}"

echo -e "${YELLOW}📝 Build Information:${NC}"
echo "  Branch: ${GIT_BRANCH}"
echo "  Commit: ${GIT_COMMIT}"
echo "  Image Tag: ${IMAGE_TAG}"

# Verificar que el archivo .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables requeridas
REQUIRED_VARS=(
    "MONGO_URL"
    "MONGO_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "GEMINI_API_KEY"
    "GEMINI_MODEL"
    "CORS_ORIGIN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Construir la imagen con el nuevo tag
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t llmteachme-api:${IMAGE_TAG} -t llmteachme-api:latest -f ../Dockerfile ..

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker image built successfully${NC}"

# Crear archivo temporal del docker-compose con valores reemplazados
TEMP_COMPOSE="/tmp/docker-compose-llmteachme-${TIMESTAMP}.yml"

echo -e "${YELLOW}📝 Generating deployment configuration...${NC}"

sed -e "s|IMAGE_TAG_PLACEHOLDER|${IMAGE_TAG}|g" \
    -e "s|MONGO_URL_PLACEHOLDER|${MONGO_URL}|g" \
    -e "s|MONGO_PASSWORD_PLACEHOLDER|${MONGO_PASSWORD}|g" \
    -e "s|JWT_SECRET_PLACEHOLDER|${JWT_SECRET}|g" \
    -e "s|JWT_REFRESH_SECRET_PLACEHOLDER|${JWT_REFRESH_SECRET}|g" \
    -e "s|GEMINI_API_KEY_PLACEHOLDER|${GEMINI_API_KEY}|g" \
    -e "s|GEMINI_MODEL_PLACEHOLDER|${GEMINI_MODEL}|g" \
    -e "s|CORS_ORIGIN_PLACEHOLDER|${CORS_ORIGIN}|g" \
    docker-compose.prod.yml > ${TEMP_COMPOSE}

echo -e "${GREEN}✓ Configuration generated${NC}"

# Desplegar el stack
echo -e "${YELLOW}🚢 Deploying to Docker Swarm...${NC}"

docker stack deploy -c ${TEMP_COMPOSE} llmteachme --prune --with-registry-auth

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Deployment failed${NC}"
    rm -f ${TEMP_COMPOSE}
    exit 1
fi

# Limpiar archivo temporal
rm -f ${TEMP_COMPOSE}

echo -e "${GREEN}✓ Stack deployed successfully${NC}"

# Esperar un momento para que el servicio se actualice
echo -e "${YELLOW}⏳ Waiting for service to update...${NC}"
sleep 5

# Mostrar estado del servicio
echo -e "${YELLOW}📊 Service Status:${NC}"
docker service ls --filter name=llmteachme

echo -e "${YELLOW}📋 Service Details:${NC}"
docker service ps llmteachme_llmteachme-api --no-trunc

# Guardar información del deployment
DEPLOY_LOG="deployments.log"
echo "${TIMESTAMP} | ${IMAGE_TAG} | ${GIT_BRANCH} | ${GIT_COMMIT}" >> ${DEPLOY_LOG}

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${YELLOW}Image Tag: ${IMAGE_TAG}${NC}"
echo ""
echo "To monitor logs run:"
echo "  docker service logs -f llmteachme_llmteachme-api"
echo ""
echo "To check service status run:"
echo "  docker service ps llmteachme_llmteachme-api"
