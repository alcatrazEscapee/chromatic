.DEFAULT_GOAL := build

PIXI    := pixi-7.2.4
WEB     := ../Website/public/chromatic/

FORCE :

.PHONY : build
build : FORCE
	@npm run build
	@rm -rf $(WEB)/lib
	@mkdir -p $(WEB)/lib
	@cp lib/$(PIXI).js $(WEB)/lib/$(PIXI).js
	@cp -r out/. $(WEB)/lib/.
	@cp -r src $(WEB)/
	@cp -r art $(WEB)/.
	@cp data-compressed.json $(WEB)/lib/puzzles.json

