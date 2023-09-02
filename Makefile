.DEFAULT_GOAL := build

PIXI        := pixi-7.2.4
FFO         := fontfaceobserver-2.1.0
WEB         := ../Website/public/chromatic/
GEN         := src/gen

TS_REAL_SRC := $(shell find src -name '*.ts' -not -name '*.d.ts' -not -wholename 'src/gen/\*')
TS_MAIN_SRC := $(shell find src -name '*.ts' -not -name '*.d.ts')
TS_TYPE_SRC := $(shell find src -name '*.d.ts')

TS_SRC      := $(TS_MAIN_SRC) $(TS_REAL_SRC) package-lock.json tsconfig.json

JS_REAL_OUT := $(TS_REAL_SRC:src/%.ts=out/%.js)
JS_MAIN_OUT := $(TS_MAIN_SRC:src/%.ts=out/%.js)
JS_MAP_OUT  := $(TS_MAIN_SRC:src/%.ts=out/%.js.map)

PNG_IN      := $(shell find art-work/pipe -name '*.png')
PNG_OVER    := $(shell find art-work/pipe -name '*overlay*.png')

PIPE_IN     := 72 90 120
PIPE_OUT    := $(PIPE_IN:%=art/sheets/pipe_%.png) $(PIPE_IN:%=art/sheets/pipe_%@1x.png.json)

WEB_JS      := $(JS_REAL_OUT:out/%.js=$(WEB)/lib/%.js) $(WEB)/lib/$(PIXI).js $(WEB)/lib/$(FFO).js
WEB_JS_MAP  := $(JS_MAP_OUT:out/%.js.map=$(WEB)/lib/%.js.map) 
WEB_TS      := $(WEB)/src
WEB_ART	    := $(WEB)/art
WEB_JSON    := $(WEB)/lib/puzzles.json


# Build (debug mode)
# Includes .js.map, copies the /src/ directory for debugger use
# Enables `window.debugMode`
.PHONY : build
build : msg-debug $(WEB_ART) $(WEB_JS) $(WEB_JSON) $(WEB_JS_MAP) $(WEB_TS)

# Build (release mode)
# Depends on `clean`
# Does not include any .js.map or /src/
# Disables `window.debugMode`
.PHONY : release
release : clean msg-release $(WEB_ART) $(WEB_JS) $(WEB_JSON)

.PHONY : msg-debug
msg-debug :
	@printf "Building... (debug mode)\n"
	@printf "const enum DebugMode { ENABLED = 1 }\n" > $(GEN)/debug.ts

.PHONY : msg-release
msg-release :
	@printf "Building... (release mode)\n"
	@printf "const enum DebugMode { ENABLED = 0 }\n" > $(GEN)/debug.ts

.PHONY : test
test :
	@npx jest

.PHONY : clean
clean :
	@printf "Clean...\n"
	@rm -rf out
	@rm -rf art/sheets
	@rm -rf $(WEB_ART)
	@rm -rf $(WEB)/lib
	@rm -rf $(WEB)/src

.PHONY : overlay
overlay :
	@python scripts/overlay.py --scan


$(WEB_TS) : $(TS_SRC)
	@cp -r src $(WEB)/

$(WEB_ART) : $(PIPE_OUT)
	@rm -rf $(WEB_ART)
	@cp -r art $(WEB)

$(WEB_JSON) : data-compressed.json
	@cp data-compressed.json $(WEB_JSON)

$(WEB)/lib/%.js : ./lib/%.min.js
	@mkdir -p $(@D)
	@cp $< $@

$(WEB)/lib/%.js : ./out/%.js
	@mkdir -p $(@D)
	@cp $< $@

$(WEB)/lib/%.js.map : ./out/%.js.map
	@mkdir -p $(@D)
	@cp $< $@


$(JS_MAIN_OUT) $(JS_MAP_OUT) &: $(TS_SRC) package-lock.json tsconfig.json
	@printf "Compiling tsc...\n"
	@npx tsc

$(PIPE_OUT) &: scripts/spritesheet.py $(PNG_IN)
	@printf "Packing sprites...\n"
	@mkdir -p art/sheets
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
