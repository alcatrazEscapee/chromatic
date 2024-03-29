SHELL := /bin/bash


PIXI        = pixi-7.2.4
PIXI_SOUND  = pixi-sound-5.2.1
FFO         = fontfaceobserver-2.1.0
WEB         = ../Website/public/chromatic/
PIPE        = art/pipe
OUT_MODE    = out/debug

SIZES       = 72 90 120
PRESSURES   = 1 2 3 4

PY_DATA     = scripts/data.py
PY_OVERLAY  = scripts/overlay.py
PY_SPRITES  = scripts/spritesheet.py

TS_SRC      = $(shell find src -name '*.ts') $(OUT_MODE) package-lock.json tsconfig.json
JS_OUT      = out/main.js

PIPE_1      = $(PRESSURES:%=curve_%) $(PRESSURES:%=edge_%) $(PRESSURE:%=port_%) $(PRESSURE:%=straight_%) mix unmix up down filter

PIPE_IN     = $(PIPE_1:%=$(PIPE)/72/%.png) $(PIPE_1:%=$(PIPE)/90/%.png) $(PIPE_1:%=$(PIPE)/120/%.png)
PIPE_OUT    = $(SIZES:%=out/sheets/pipe_%.png) $(SIZES:%=out/sheets/pipe_%@1x.png.json)
CORE_OUT    = out/sheets/core.png out/sheets/core@1x.png.json

DATA_IN     = $(shell find data -name '\*.json')
DATA_OUT    = out/puzzles.json

ART_IN      = $(shell find art/textures -name '\*.png')

OVERLAY_1   = $(PRESSURES:%=_%_overlay_h.png) $(PRESSURES:%=_%_overlay_v.png)
OVERLAY_2   = $(OVERLAY_1:%=curve%) $(OVERLAY_1:%=port%) $(OVERLAY_1:%=straight%)

OVERLAY_OUT = $(OVERLAY_2:%=$(PIPE)/72/%) $(OVERLAY_2:%=$(PIPE)/90/%) $(OVERLAY_2:%=$(PIPE)/120/%)

AUDIO_IN    = $(shell find audio -name '*.mp3')

WEB_JS      = $(WEB)/lib/main.js $(WEB)/lib/$(PIXI).js $(WEB)/lib/$(PIXI_SOUND).js $(WEB)/lib/$(FFO).js
WEB_JS_MAP  = $(WEB)/lib/main.js.map $(WEB)/lib/pixi.js.map $(WEB)/lib/pixi-sound.js.map
WEB_JSON    = $(WEB)/lib/puzzles.json
WEB_TS      = $(WEB)/src
WEB_ART     = $(WEB)/art
WEB_AUDIO   = $(WEB)/audio

.DEFAULT_GOAL = build
.SILENT :
FORCE :

# Build (debug mode)
# Includes .js.map, copies the /src/ directory for debugger use
# Sets `DEBUG = true`
.PHONY : build
build : build-debug $(OUT_MODE) $(WEB_ART) $(WEB_AUDIO) $(WEB_JSON) $(WEB_TS) $(WEB_JS) $(WEB_JS_MAP)

# Build (release mode)
# Depends on `clean`
# Does not include any .js.map or /src/
# Sets `DEBUG = false`
.PHONY : release
release : clean-release build-release $(OUT_MODE) $(WEB_ART) $(WEB_AUDIO) $(WEB_JSON) $(WEB_JS)

.PHONY : build-debug
build-debug :
	printf "Building... (debug mode)\n"
	$(eval DEBUG = 1)

.PHONY : build-release
build-release :
	printf "Building... (release mode)\n"
	$(eval DEBUG = 0)

.PHONY : clean
clean : clean-release
	rm -rf out
	find art/pipe -name '*_overlay_*.png' -delete

.PHONY : clean-release
clean-release :
	printf "Clean...\n"
	rm -rf $(WEB_ART)
	rm -rf $(WEB)/lib
	rm -rf $(WEB)/src


# Writes $(OUT_MODE) as an indicator of what mode `main.js` was last compiled with.
# Uses `grep` to not overwrite if not source changed, to prevent needing to recompile TS on each build
$(OUT_MODE) : FORCE
	@mkdir -p out
	if ! grep $(DEBUG) $(OUT_MODE) -q -s ; then \
		printf "$(DEBUG)" > $(OUT_MODE) ; \
	fi

.PHONY : test
test : $(DATA_OUT) FORCE
	npx jest


$(WEB_TS) : $(TS_SRC)
	cp -r src $(WEB)/

$(WEB_ART) : $(PIPE_OUT) $(CORE_OUT)
	printf "Copying art...\n"
	rm -rf $(WEB_ART)
	cp -r out/sheets/. $(WEB_ART)

$(WEB_AUDIO) : $(AUDIO_IN)
	printf "Copying audio...\n"
	rm -rf $(WEB_AUDIO)
	cp -r audio $(WEB_AUDIO)

$(WEB_JSON) : $(DATA_OUT)
	mkdir -p $(WEB)/lib
	cp $(DATA_OUT) $(WEB_JSON)

$(WEB_JS) &: $(JS_OUT)
	printf "Copying scripts...\n"
	mkdir -p $(WEB)/lib
	cp $(JS_OUT) $(WEB)/lib/main.js
	cp lib/$(PIXI).min.js $(WEB)/lib/pixi.js
	cp lib/$(PIXI_SOUND).min.js $(WEB)/lib/pixi-sound.js
	cp lib/$(FFO).min.js $(WEB)/lib/fontfaceobserver.js

$(WEB_JS_MAP) &: $(JS_OUT).map
	printf "Copying source maps...\n"
	mkdir -p $(WEB)/lib
	cp $(JS_OUT).map $(WEB)/lib/main.js.map
	cp lib/$(PIXI).min.js.map $(WEB)/lib/pixi.min.js.map
	cp lib/$(PIXI_SOUND).min.js.map $(WEB)/lib/pixi-sound.js.map

$(JS_OUT) $(JS_OUT).map &: $(TS_SRC) package.json package-lock.json tsconfig.json
	printf "Checking types...\n"
	npx tsc
	printf "Running tests...\n"
	npx jest
	printf "Compiling...\n"
	npx esbuild src/main.ts --outfile=$(JS_OUT) --bundle $(if $(filter 1, $(DEBUG)), --sourcemap --define:DEBUG=true, --minify --define:DEBUG=false) --define:VERSION=\"$(shell grep -oP "version\": \"\K[^\"]+" package.json)\"


.PHONY : spritesheets
spritesheets : $(PIPE_OUT)

$(PIPE_OUT) $(CORE_OUT) &: $(PIPE_IN) $(OVERLAY_OUT) $(ART_IN) $(PY_SPRITES)
	printf "Packing sprites...\n"
	mkdir -p out/sheets
	python $(PY_SPRITES) --src $(PIPE)/72 --dest out/sheets/ --key pipe_72
	python $(PY_SPRITES) --src $(PIPE)/90 --dest out/sheets/ --key pipe_90
	python $(PY_SPRITES) --src $(PIPE)/120 --dest out/sheets/ --key pipe_120
	python $(PY_SPRITES) --src art/textures --dest out/sheets/ --key core --no-prefix


# make overlay := prints out scan results
#
# Possible options
# --overlay72=5 --overlay90=2 --overlay120=8
# --overlay72=11 --overlay90=11 --overlay120=16
.PHONY : overlay
overlay :
	python $(PY_OVERLAY) --scan

$(OVERLAY_OUT) &: $(PY_OVERLAY)
	printf "Generating overlays...\n"
	python $(PY_OVERLAY) --overlay72=11 --overlay90=11 --overlay120=16

$(DATA_OUT) : $(DATA_IN) src/constants.ts $(PY_DATA)
	printf "Writing puzzles.json...\n"
	python $(PY_DATA)
