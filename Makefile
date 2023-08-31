.DEFAULT_GOAL := build

PIXI     := pixi-7.2.4
FFO      := fontfaceobserver-2.1.0
WEB      := ../Website/public/chromatic/

TS_SRC   := $(shell find src -name '*.ts' -not -name '*.d.ts')
TS_D_SRC := $(shell find src -name '*.d.ts')
JS_OUT   := $(TS_SRC:src/%.ts=out/%.js)
JS_MAP   := $(TS_SRC:src/%.ts=out/%.js.map)

PNG_IN   := $(shell find art-work/pipe -name '*.png')
PNG_OVER := $(shell find art-work/pipe -name '*overlay*.png')

PIPE_IN  := 72 90 120
PIPE_OUT := $(PIPE_IN:%=art/sheets/pipe_%.png) $(PIPE_IN:%=art/sheets/pipe_%@1x.png.json)


.PHONY : build
build : $(WEB)/touch

.PHONY : test
test :
	@npx jest

.PHONY : clean
clean :
	@rm -rf out
	@rm -rf $(WEB)/art
	@rm -rf $(WEB)/lib
	@rm -rf $(WEB)/src

.PHONY : overlay
overlay :
	@python scripts/overlay.py --scan

$(WEB)/touch : data-compressed.json $(JS_OUT) $(JS_MAP) $(PIPE_OUT)
	@printf "Copying files...\n"
	@rm -rf $(WEB)/lib
	@mkdir -p $(WEB)/lib
	@cp lib/$(PIXI).min.js $(WEB)/lib/$(PIXI).js
	@cp lib/$(FFO).min.js $(WEB)/lib/$(FFO).js
	@cp -r out/. $(WEB)/lib/.
	@cp -r src $(WEB)/
	@cp -r art $(WEB)/.
	@cp data-compressed.json $(WEB)/lib/puzzles.json
	@touch $(WEB)/touch

$(JS_OUT) $(JS_MAP) &: $(TS_SRC) $(TS_D_SRC) package-lock.json tsconfig.json
	@printf "Compiling tsc...\n"
	@npx tsc

$(PIPE_OUT) &: scripts/spritesheet.py $(PNG_IN)
	@printf "Packing sprites...\n"
	@python scripts/spritesheet.py --src art-work/pipe/72 --dest art/sheets/ --key pipe_72
	@python scripts/spritesheet.py --src art-work/pipe/90 --dest art/sheets/ --key pipe_90
	@python scripts/spritesheet.py --src art-work/pipe/120 --dest art/sheets/ --key pipe_120

# Possible options
# --overlay72=5 --overlay90=2 --overlay120=8
# --overlay72=11 --overlay90=11 --overlay120=16
$(PNG_OVER) &: scripts/overlay.py
	@printf "Generating overlays...\n"
	@python scripts/overlay.py --overlay72=11 --overlay90=11 --overlay120=16

data-compressed.json data-rewrite.json &: scripts/rewrite.py data.json
	@printf "Writing puzzles.json..."
	@python scripts/rewrite.py
