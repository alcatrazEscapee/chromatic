.DEFAULT_GOAL := build

PIXI        := pixi-7.2.4
FFO         := fontfaceobserver-2.1.0
WEB         := ../Website/public/chromatic/
GEN         := src/gen
GEN_DEBUG   := $(GEN)/debug.ts
GEN_CONSTS  := $(GEN)/constants.ts

PY_DATA     := scripts/data.py
PY_OVERLAY  := scripts/overlay.py
PY_SPRITES  := scripts/spritesheet.py

TS_REAL_SRC := $(shell find src -name '*.ts' -not -name '*.d.ts' -not -wholename 'src/gen/\*')
TS_MAIN_SRC := $(shell find src -name '*.ts' -not -name '*.d.ts')
TS_TYPE_SRC := $(shell find src -name '*.d.ts')

TS_SRC      := $(TS_MAIN_SRC) $(TS_REAL_SRC) $(GEN_DEBUG) package-lock.json tsconfig.json

JS_REAL_OUT := $(TS_REAL_SRC:src/%.ts=out/%.js)
JS_MAIN_OUT := $(TS_MAIN_SRC:src/%.ts=out/%.js)
JS_MAP_OUT  := $(TS_MAIN_SRC:src/%.ts=out/%.js.map)

PNG_IN      := $(shell find art-work/pipe -name '*.png')
PNG_OVER    := $(shell find art-work/pipe -name '*overlay*.png')

PIPE_IN     := 72 90 120
PIPE_OUT    := $(PIPE_IN:%=art/sheets/pipe_%.png) $(PIPE_IN:%=art/sheets/pipe_%@1x.png.json)

DATA_IN     := $(shell find data -name '\*.json')
DATA_OUT    := out/puzzles.json

ART_IN      := $(shell find art -name '*.png') 

WEB_JS      := $(JS_REAL_OUT:out/%.js=$(WEB)/lib/%.js) $(WEB)/lib/$(PIXI).js $(WEB)/lib/$(FFO).js
WEB_JS_MAP  := $(JS_MAP_OUT:out/%.js.map=$(WEB)/lib/%.js.map) 
WEB_TS      := $(WEB)/src
WEB_ART	    := $(WEB)/art
WEB_JSON    := $(WEB)/lib/puzzles.json

DEBUG =

FORCE :

# Build (debug mode)
# Includes .js.map, copies the /src/ directory for debugger use
# Sets `DebugMode.ENABLED = 1`
.PHONY : build
build : build-debug $(GEN_DEBUG) $(WEB_ART) $(WEB_JS) $(WEB_JSON) $(WEB_JS_MAP) $(WEB_TS)

# Build (release mode)
# Depends on `clean`
# Does not include any .js.map or /src/
# Sets `DebugMode.ENABLED = 0`
.PHONY : release
release : clean-release build-release $(GEN_DEBUG) $(WEB_ART) $(WEB_JS) $(WEB_JSON)

.PHONY : build-debug
build-debug :
	@printf "Building... (debug mode)\n"
	$(eval DEBUG = 1)

.PHONY : build-release
build-release :
	@printf "Building... (release mode)\n"
	$(eval DEBUG = 0)

.PHONY : clean
clean : clean-release
	@rm -rf out
	@rm -rf art/sheets

.PHONY : clean-release
clean-release :
	@printf "Clean...\n"
	@rm -rf $(WEB_ART)
	@rm -rf $(WEB)/lib
	@rm -rf $(WEB)/src


.PHONY : test
test : $(DATA_OUT) FORCE
	@npx jest


# Writes gen/debug.ts
# Uses `grep` to not overwrite if not source changed, to prevent needing to recompile TS on each build
$(GEN_DEBUG) : 
	@if ! grep $(DEBUG) $(GEN_DEBUG) -q -s ; then \
		printf "const enum DebugMode { ENABLED = $(DEBUG) }\n" > $(GEN_DEBUG) ; \
	fi

$(WEB_TS) : $(TS_SRC)
	@cp -r src $(WEB)/

$(WEB_ART) : $(ART_IN)
	@printf "Copying art...\n"
	@rm -rf $(WEB_ART)
	@cp -r art $(WEB)

$(WEB_JSON) : $(DATA_OUT)
	@cp $(DATA_OUT) $(WEB_JSON)

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

$(PIPE_OUT) &: $(PNG_IN) $(PY_SPRITES)
	@printf "Packing sprites...\n"
	@mkdir -p art/sheets
	@python $(PY_SPRITES) --src art-work/pipe/72 --dest art/sheets/ --key pipe_72
	@python $(PY_SPRITES) --src art-work/pipe/90 --dest art/sheets/ --key pipe_90
	@python $(PY_SPRITES) --src art-work/pipe/120 --dest art/sheets/ --key pipe_120


# make overlay := prints out scan results
#
# Possible options
# --overlay72=5 --overlay90=2 --overlay120=8
# --overlay72=11 --overlay90=11 --overlay120=16
.PHONY : overlay
overlay :
	@python $(PY_OVERLAY) --scan

$(PNG_OVER) &: $(PY_OVERLAY)
	@printf "Generating overlays...\n"
	@python $(PY_OVERLAY) --overlay72=11 --overlay90=11 --overlay120=16

$(DATA_OUT) : $(DATA_IN) $(GEN_CONSTS) $(PY_DATA)
	@printf "Writing puzzles.json..."
	@python $(PY_DATA)
