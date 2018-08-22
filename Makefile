IMAGE=jacky1999cn2000/loader
GIT_HASH=$(shell git rev-parse --short HEAD)

upload:
	aws s3 cp ./config/downupload.json s3://youtube-farming/test/ --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers

install:
	docker run -i --rm --name install -v `pwd`:/usr/src/app -w /usr/src/app node:8 npm install

run: install
	docker-compose down
	docker-compose up

bash:
	docker run -it --rm -v `pwd`:/usr/src/app -w /usr/src/app --entrypoint="bash" loader_worker

build_image: install version
	$(info GIT_HASH: $(GIT_HASH))
	docker build --no-cache -t $(IMAGE):${GIT_HASH} .

tag: build_image
	docker tag $(IMAGE):${GIT_HASH} ${IMAGE}:latest

push: tag
	docker push ${IMAGE}:${GIT_HASH}
	docker push ${IMAGE}:latest

version:
	git log -n 1 > BUILD-VERSION.txt
