# Variables
IMAGE_NAME = fastapi-backend
CONTAINER_NAME = fastapi-app
PORT = 8000

# Build l'image Docker
build:
	docker build -t $(IMAGE_NAME) .

# Lance le container (avec volumes pour persistance)
run:
	docker run -d --name $(CONTAINER_NAME) \
		-p $(PORT):8000 \
		-v $(CURDIR)/ordet.json:/app/ordet.json \
		-v $(CURDIR)/dailyr.json:/app/dailyr.json \
        --restart always \
		$(IMAGE_NAME)

# Stoppe le container
stop:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

# Redémarre : stop + run
docker-restart: stop run

# Nettoie image + container
docker-clean: stop
	docker rmi $(IMAGE_NAME) || true

# Affiche les logs du container
docker-logs:
	@echo "Containers existants :"
	@docker ps -a
	@echo ""
	@echo "Logs du container $(CONTAINER_NAME) :"
	docker logs -f $(CONTAINER_NAME)

# Compose commands
up:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

restart: down up

clean:
	docker-compose down --rmi all --volumes --remove-orphans
