.DEFAULT_GOAL := build

PIXI     := pixi-7.2.4
WEB      := ../Website/public/chromatic/

TS_SRC   := $(shell find src -name '*.ts')
JS_OUT   := $(TS_SRC:src/%.ts=out/%.js)
JS_MAP   := $(TS_SRC:src/%.ts=out/%.js.map)

PNG_IN   := $(shell find art-work/pipe -name '*.png')

PIPE_IN  := 72 90 120
PIPE_OUT := $(PIPE_IN:%=art/sheets/pipe_%.png) $(PIPE_IN:%=art/sheets/pipe_%@1x.png.json)

FORCE :

.PHONY : build
build : data-compressed.json $(JS_OUT) $(JS_MAP) $(PIPE_OUT)
	@printf "Copying files...\n"
	@rm -rf $(WEB)/lib
	@mkdir -p $(WEB)/lib
	@cp lib/$(PIXI).js $(WEB)/lib/$(PIXI).js
	@cp -r out/. $(WEB)/lib/.
	@cp -r src $(WEB)/
	@cp -r art $(WEB)/.
	@cp data-compressed.json $(WEB)/lib/puzzles.json

.PHONY : test
test : FORCE
	@npx jest

$(JS_OUT) $(JS_MAP) &: $(TS_SRC) package-lock.json
	@printf "Compiling tsc...\n"
	@npx tsc

$(PIPE_OUT) &: scripts/spritesheet.py $(PNG_IN)
	@printf "Packing sprites...\n"
	@python scripts/spritesheet.py --src art-work/pipe/72 --dest art/sheets/ --key pipe_72 --debug
	@python scripts/spritesheet.py --src art-work/pipe/90 --dest art/sheets/ --key pipe_90 --debug
	@python scripts/spritesheet.py --src art-work/pipe/120 --dest art/sheets/ --key pipe_120 --debug

data-compressed.json data-rewrite.json &: scripts/rewrite.py data.json
	@printf "Writing puzzles.json..."
	@python scripts/rewrite.py
