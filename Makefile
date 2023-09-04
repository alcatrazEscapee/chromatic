.DEFAULT_GOAL := build

PIXI        := pixi-7.2.4
FFO         := fontfaceobserver-2.1.0
WEB         := ../Website/public/chromatic/
GEN         := src/gen
TEX			:= art/textures
PIPE		:= art/pipe
GEN_DEBUG   := $(GEN)/debug.ts
GEN_CONSTS  := $(GEN)/constants.ts

SIZES       := 72 90 120
PRESSURES   := 1 2 3 4

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

PIPE_1	    := $(PRESSURES:%=curve_%) $(PRESSURES:%=edge_%) $(PRESSURE:%=port_%) $(PRESSURE:%=straight_%) mix unmix up down

PIPE_IN     := $(PIPE_1:%=$(PIPE)/72/%.png) $(PIPE_1:%=$(PIPE)/90/%.png) $(PIPE_1:%=$(PIPE)/120/%.png)
PIPE_OUT    := $(SIZES:%=out/sheets/pipe_%.png) $(SIZES:%=out/sheets/pipe_%@1x.png.json)

DATA_IN     := $(shell find data -name '\*.json')
DATA_OUT    := out/puzzles.json

ART_IN      := $(shell find $(TEX) -name '*.png')

OVERLAY_1   := $(PRESSURES:%=_%_overlay_h.png) $(PRESSURES:%=_%_overlay_v.png)
OVERLAY_2   := $(OVERLAY_1:%=curve%) $(OVERLAY_1:%=port%) $(OVERLAY_1:%=straight%)

OVERLAY_OUT := $(OVERLAY_2:%=$(PIPE)/72/%) $(OVERLAY_2:%=$(PIPE)/90/%) $(OVERLAY_2:%=$(PIPE)/120/%)

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
	@find art/pipe -name '*_overlay_*.png' -delete

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

$(WEB_ART) : $(ART_IN) $(PIPE_OUT)
	@printf "Copying art...\n"
	@rm -rf $(WEB_ART)
	@cp -r $(TEX)/. $(WEB_ART)
	@cp -r out/sheets $(WEB_ART)

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

$(PIPE_OUT) &: $(PIPE_IN) $(OVERLAY_OUT) $(PY_SPRITES)
	@printf "Packing sprites...\n"
	@mkdir -p out/sheets
	@python $(PY_SPRITES) --src $(PIPE)/72 --dest out/sheets/ --key pipe_72
	@python $(PY_SPRITES) --src $(PIPE)/90 --dest out/sheets/ --key pipe_90
	@python $(PY_SPRITES) --src $(PIPE)/120 --dest out/sheets/ --key pipe_120


# make overlay := prints out scan results
#
# Possible options
# --overlay72=5 --overlay90=2 --overlay120=8
# --overlay72=11 --overlay90=11 --overlay120=16
.PHONY : overlay
overlay :
	@python $(PY_OVERLAY) --scan

$(OVERLAY_OUT) &: $(PY_OVERLAY)
	@printf "Generating overlays...\n"
	@python $(PY_OVERLAY) --overlay72=11 --overlay90=11 --overlay120=16

$(DATA_OUT) : $(DATA_IN) $(GEN_CONSTS) $(PY_DATA)
	@printf "Writing puzzles.json..."
	@python $(PY_DATA)
