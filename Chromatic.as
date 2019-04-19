package  {
	import flash.display.MovieClip;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.events.TransformGestureEvent;
	import flash.net.URLRequest;
	import flash.net.URLLoader;
	import Elements.*;
	import flash.media.Sound;
	import flash.media.SoundChannel;
	import flash.net.SharedObject;
	import flash.desktop.NativeApplication;
	import flash.ui.Multitouch;
	import flash.ui.MultitouchInputMode;
	import flash.display.DisplayObject;
	
	public class Chromatic extends MovieClip{
		
		// Session Constants:
		
		private var loader:URLLoader;
		private var data:XML;
		private var saveData:Object;
		private var vic:Boolean;
		private var splash:String;
		private var cons:C;
		
		private var tutTog:Boolean;
		private var musTog:Boolean;
		private var tt:int;
		
		private var musicList:Array;
		private var channel:SoundChannel;
		private var currentSong:int;
		private var playing:Boolean;
		private var lastPos:int;
		
		private var saveGame:SharedObject;
		
		// UI Variables
				
		private var anim:String;
		private var animT:int;
		private var posList:Array;
		
		private var icList:Array;
		
		private var pointer:int;
		private var puzzlePointer:int;
		
		private var mScreen:MainMenuScreen;
		private var lScreen:LoadSaveScreen;
		private var fScreen:FadePass;
		private var ui:IGUserInterface;
		private var uiMenu:UIMenu;
		private var iScreen:InteruptScreen;
		private var oScreen:OptionsScreen;
		
		// Interface Variables
		
		private var tiles:Array;
		private var pipeBtns:Array;
		private var inoutSyms:Array;
		private var filterObjects:Array;
		
		private var tW:int;
		private var w:int;
		private var tileSel:int;
		
		private var tile:PipeButton;
		private var clabel:ColSym;
		private var plabel:PreSym;
		
		private var tabState:String;
		
		private var currentCol:String;
		private var currentPre:int;
		
		private var basicTxt:BasicTxt;
		private var iTxt:TooltipText;
		
		private var tooltipT:int;
		
		// Algorithim Variables
		
		private var tileActual:Array;
		private var actions:Array;
		private var tileFull:Array;
		private var tileCon:Array;
		private var filterList:Array;
		
		private var saves:Array;
		
		private var simT:int;
		
		private var errors:Array;
		private var eList:Array;
		private var tError:int;
		private var errorTxt:BasicTxt;
				
		public function Chromatic() {
			loadData();
		}
		
		private function loadData():void{
			loader = new URLLoader;
			
			// Declare One Time Session Constants
			
			mScreen = new MainMenuScreen();
			lScreen = new LoadSaveScreen();
			fScreen = new FadePass();
			ui = new IGUserInterface();
			uiMenu = new UIMenu();
			iScreen = new InteruptScreen();
			oScreen = new OptionsScreen();
			
			tile = new PipeButton();
			clabel = new ColSym();
			plabel = new PreSym();
			basicTxt = new BasicTxt();
			errorTxt = new BasicTxt();
			iTxt = new TooltipText();
			iTxt.alpha = 0;
			
			musicList = new Array();
			channel = new SoundChannel();
			musicList = [new Music_01()];
			currentSong = 0;
			
			tutTog = true;
			musTog = true;
			tt = 110;
			lastPos = 0;
			
			Multitouch.inputMode = MultitouchInputMode.GESTURE;
			cons = new C();
			
			splash = "";
			vic = false;
			
			var swfDir:String = loaderInfo.url.substring(0, loaderInfo.url.lastIndexOf("/")+1);
			loader.load(new URLRequest(swfDir + "data.xml"));
			loader.addEventListener(Event.COMPLETE, processXML);
		}
		
		private function processXML(e:Event):void{
			data = new XML(e.target.data);
			
			saveGame = SharedObject.getLocal("chromatic_data");
			if(saveGame.data.musPref == null || saveGame.data.tutPref == null || saveGame.data.sd == null){
				var sdArr:Array = new Array();
				for(var i:int = 0;i<data.pack.itm.length();i++){
					sdArr[data.pack.itm[i].@id] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
				}
				sdArr[0][0] = 1;
				saveGame.data.musPref = true;
				saveGame.data.tutPref = true;
				saveGame.data.ttPref = 110;
				saveGame.data.sd = sdArr;
				saveGame.flush();
				saveData = new Array();
				createSaveData("blank");
			}else{
				tutTog = saveGame.data.tutPref;
				musTog = saveGame.data.musPref;
				saveData = saveGame.data.sd;
				fixSaveData();
				if(saveGame.data.ttPref == null){
					saveGame.data.ttPref = 110;
				}
				tt = saveGame.data.ttPref;
			}
			if(musTog == true){
				channel = musicList[currentSong].play(lastPos);
				channel.addEventListener(Event.SOUND_COMPLETE, replay);
				playing = true;
			}else{
				playing = false;
				channel.stop();
			}
			fixSaves();
			NativeApplication.nativeApplication.addEventListener(Event.DEACTIVATE, handleDeactivate,false,0,true);
			NativeApplication.nativeApplication.addEventListener(Event.ACTIVATE, handleActivate,false,0,true);
			
			prepMainMenu();
			runMainMenu();
	 	}
		
		// Music
		
		private function replay(e:Event):void{
			channel.removeEventListener(Event.SOUND_COMPLETE, replay);
			currentSong++;
			if(currentSong == musicList.length){
				currentSong=0;
			}
			lastPos = 0;
			channel = musicList[currentSong].play();
			channel.addEventListener(Event.SOUND_COMPLETE, replay);
		}
		private function handleDeactivate(e:Event):void{
			if(musTog == true && playing == true){
				channel.removeEventListener(Event.SOUND_COMPLETE, replay);
				lastPos = channel.position;
				channel.stop();
				playing = false;
			}
		}
		private function handleActivate(e:Event):void{
			if(musTog == true && playing == false){
				currentSong++;
				if(currentSong == musicList.length){
					currentSong=0;
				}	
				channel = musicList[currentSong].play(lastPos);
				channel.addEventListener(Event.SOUND_COMPLETE, replay);
				playing = true;
			}
		}
		
		// Main Menu Related Functions
		private function prepMainMenu():void{
			addChild(mScreen);
			mScreen.version_text.text = data.versionData.@data;
			updateMainPointers();
			for(var i:int = 0;i<data.pack.itm.length();i++){
				var p:PackSelectionIcon = new PackSelectionIcon();
				mScreen.addChildAt(p,i);
				p.x = 120 + i*400 // Base value + distance between each*i
				p.y = 160 // Base value
				p.titleTxt.text = data.pack.itm.(@id==i).@nameStr;
				p.ic.numTxt.text = countSaves(i)+"/16";
				p.ic.sym.gotoAndStop(checkSaveDym(i));
				//p.addEventListener(MouseEvent.CLICK, animMenuToPuzzle);
			}
			pointer = 0;
		}
		private function addOtherButtons():void{
			mScreen.removeChildAt(0);
			for(var i:int = 0;i<data.pack.itm.length();i++){
				var p:PackSelectionIcon = new PackSelectionIcon();
				mScreen.addChildAt(p,i);
				p.x = 120 + (i-pointer)*400 // Base value + distance between each*(i - pointer value)
				p.y = 160;
				p.titleTxt.text = data.pack.itm.(@id==i).@nameStr;
				p.ic.numTxt.text = countSaves(i)+"/16";
				p.ic.sym.gotoAndStop(checkSaveDym(i));
				p.addEventListener(MouseEvent.CLICK, animMenuToPuzzle);
			}
		}
		private function updateMainPointers():void{
			if(pointer>0){
				mScreen.cycleL.visible = true;
			}else{
				mScreen.cycleL.visible = false;
			}
			if(pointer<data.pack.itm.length()-1){
				mScreen.cycleR.visible = true;
			}else{
				mScreen.cycleR.visible = false;
			}
		}
		private function runMainMenu():void{
			updateMainPointers();
			if(pointer<data.pack.itm.length()-1){
				mScreen.cycleR.addEventListener(MouseEvent.CLICK, cyclePacksR);
			}
			if(pointer>0){
				mScreen.cycleL.addEventListener(MouseEvent.CLICK, cyclePacksL);
			}
			mScreen.loadBtn.addEventListener(MouseEvent.CLICK, animMainToLoad);
			for(var i:int = 0;i<data.pack.itm.length();i++){
				var p:MovieClip = mScreen.getChildAt(i) as MovieClip;
				p.addEventListener(MouseEvent.CLICK,animMenuToPuzzle);
				p.ic.numTxt.text = countSaves(i)+"/16";
				p.ic.sym.gotoAndStop(checkSaveDym(i));
			}
			stage.addEventListener(TransformGestureEvent.GESTURE_SWIPE, swipePacks); 
		}
		private function stopMainMenu():void{
			if(pointer<data.pack.itm.length()-1){
				mScreen.cycleR.removeEventListener(MouseEvent.CLICK, cyclePacksR);
			}
			if(pointer>0){
				mScreen.cycleL.removeEventListener(MouseEvent.CLICK, cyclePacksL);
			}
			mScreen.loadBtn.removeEventListener(MouseEvent.CLICK, animMainToLoad);
			for(var i:int = 0;i<data.pack.itm.length();i++){
				mScreen.getChildAt(i).removeEventListener(MouseEvent.CLICK,animMenuToPuzzle);
			}
			stage.removeEventListener(TransformGestureEvent.GESTURE_SWIPE, swipePacks); 
		}
		
		private function swipePacks(e:TransformGestureEvent):void{
			if (e.offsetX == -1) { 
				//User swiped towards right
				if(pointer<data.pack.itm.length()-1){
					pointer++;
					animCyclePacks(-1);
					updateMainPointers();
				}
			}else if (e.offsetX == 1) { 
				//User swiped towards left
				if(pointer>0){
					pointer--;
					animCyclePacks(1);
					updateMainPointers();
				}
			}
		}
		private function cyclePacksR(e:Event):void{
			if(pointer<data.pack.itm.length()-1){
				pointer++;
				animCyclePacks(-1);
				updateMainPointers();
			}
		}
		private function cyclePacksL(e:Event):void{
			if(pointer>0){
				pointer--;
				animCyclePacks(1);
				updateMainPointers();
			}
		}
		
		private function runLoadScreen():void{
			lScreen.backBtn.addEventListener(MouseEvent.CLICK, exitLoadPass);
			lScreen.enterBtn.addEventListener(MouseEvent.CLICK, exitLoadTrue);
		}
		private function stopLoadScreen():void{
			lScreen.backBtn.removeEventListener(MouseEvent.CLICK, exitLoadPass);
			lScreen.enterBtn.removeEventListener(MouseEvent.CLICK, exitLoadTrue);
		}
		
		private function exitLoadPass(e:MouseEvent):void{
			animLoadToMain();
		}
		private function exitLoadTrue(e:MouseEvent):void{
			if(String(lScreen.inpTxt.text) == "sandbox"){
				for(var i:int = 0;i<data.pack.itm.length();i++){
					saveData[i] = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
				}
			}else if(String(lScreen.inpTxt.text) == "reset"){
				for(i = 0;i<data.pack.itm.length();i++){
					saveData[i] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
				}
				saveData[0][0] = 1;
			}else if(String(lScreen.inpTxt.text) == "dev_clear"){
				saveGame.clear();
			}else if(String(lScreen.inpTxt.text) == "dev_wingame"){
				for(i = 0;i<data.pack.itm.length();i++){
					saveData[i] = [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2];
				}
			}else if(String(lScreen.inpTxt.text) == "dev_unlockspecial"){
				saveData[0][15] = 1;
			}
			animLoadToMain();
		}
		
		// Puzzle Menu Related Functions
		private function runPuzzleMenu():void{
			for(var i:int = 0;i<icList.length;i++){
				icList[i].addEventListener(MouseEvent.CLICK, checkLock);
			}
			var p:MovieClip = mScreen.getChildAt(0) as MovieClip;
			p.back.addEventListener(MouseEvent.CLICK, animPuzzleToMenu);
		}
		private function stopPuzzleMenu():void{
			for(var i:int = 0;i<icList.length;i++){
				icList[i].removeEventListener(MouseEvent.CLICK, animPuzzleToInterface);
			}
			var p:MovieClip = mScreen.getChildAt(0) as MovieClip;
			p.back.removeEventListener(MouseEvent.CLICK, animPuzzleToMenu);
		}
		
		private function checkLock(e:MouseEvent):void{
			for(var i:int = 0;i<icList.length;i++){
				if(e.currentTarget == icList[i]){
					break;
				}
			}
			if(saveData[pointer][i]>0){
				animPuzzleToInterface();
				puzzlePointer = i;
			}
		}
		
		// Puzzle User Interface Related Functions
		private function prepUI(pass:Boolean = false):void{
			tiles = new Array();
			w = data.pack.itm.(@id==pointer).@size;
			tW = 330/w;
			for(var i:int = 0;i<Math.pow(w,2);i++){
				var t:Tile = new Tile();
				t.height = tW;
				t.width = tW;
				t.x = 35 + (i%w)*t.width;
				t.y = 35 + Math.floor(i/w)*t.height;
				ui.addChild(t);
				tiles.push(t);
				// To Get Center of Tile:
				// cx = 35 + t.w/2 + i/w
				// cy = 35 + t.h/2 + j/w
			}
			ui.crossOverlay.gotoAndStop(w-2);
			ui.crossOverlay.alpha = 0.4;
			setChildIndex(ui,numChildren-1);
			tabState = "hammer";
			ui.tabs.gotoAndStop(1);
			pipeBtns = new Array();
			for(var j:int = 0;j<8;j++){
				var s:PipeButton = new PipeButton();
				s.x = 13+(j%4)*55+ui.tabs.x;
				s.y = 13+(Math.floor(j/4))*55+ui.tabs.y;
				s.pipe.gotoAndStop(j+1);
				//s.pipe.scaleX = 50/110;
				//s.pipe.scaleY = 50/110;
				ui.addChild(s);
				pipeBtns.push(s);
			}
			inoutSyms = new Array();
			tileCon = new Array();
			actions = new Array();
			filterList = new Array();
			filterObjects = new Array();
			for(var k:int = 0;k<int(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin.length());k++){
				var pos:int = data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@pos;
				var input:InOut = new InOut();
				input.anim.gotoAndStop(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@col);
				if(pos<w){ // ON 3x3: pos=0,1,2 TOP Position
					input.rotation = 0;
					input.x = 35 + tW*pos + tW*0.5;
					input.y = 17.5;
				}else if(pos<2*w){ // ON 3x3: pos=3,4,5 RIGHT Position
					input.rotation = 90;
					input.x = 382.5;
					input.y = 35 + tW*(pos-w) + tW*0.5;
				}else if(pos<3*w){ // ON 3x3: pos=6,7,8: BOT Position
					input.rotation = 180;
					input.x = 365 - tW*(pos-2*w) - tW*0.5;
					input.y = 382.5;
				}else if(pos<4*w){ // ON 3x3: pos=9,10,11 LEFT Position
					input.rotation = 270;
					input.x = 17.5;
					input.y = 365 - tW*(pos-3*w) - tW*0.5;
				}
				
				input.pre.gotoAndStop(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@pres);
				ui.addChild(input);
				inoutSyms.push(input);
				var obj:Object = new Object();
				//obj.pos = pos;
				//obj.col = data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@col;
				obj = generateInitialAction(pos, data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@col);
				obj.circPos = pos;
				obj.pre = data.puzzle.(@id==puzzlePointer).(@pack==pointer).pin[k].@pres;
				actions.push(obj);
			}
			var uidC:int = 1;
			for(k = 0;k<int(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout.length());k++){
				pos = data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout[k].@pos;
				input = new InOut();
				input.gotoAndStop(2);
				input.anim.gotoAndStop(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout[k].@col);
				if(pos<w){ // ON 3x3: pos=0,1,2 TOP Position
					input.rotation = 0;
					input.x = 35 + tW*pos + tW*0.5;
					input.y = 17.5;
				}else if(pos<2*w){ // ON 3x3: pos=3,4,5 RIGHT Position
					input.rotation = 90;
					input.x = 382.5;
					input.y = 35 + tW*(pos-w) + tW*0.5;
				}else if(pos<3*w){ // ON 3x3: pos=6,7,8 BOT Position
					input.rotation = 180;
					input.x = 365 - tW*(pos-2*w) - tW*0.5;
					input.y = 382.5;
				}else if(pos<4*w){ // ON 3x3: pos=9,10,11 LEFT Position
					input.rotation = 270;
					input.x = 17.5;
					input.y = 365 - tW*(pos-3*w) - tW*0.5;
				}
				input.pre.gotoAndStop(data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout[k].@pres);
				input.setUID(uidC);
				ui.addChild(input);
				inoutSyms.push(input);
				obj = new Object();
				obj = generateTileCon(pos, data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout[k].@col);
				obj.circPos = pos;
				obj.pre = data.puzzle.(@id==puzzlePointer).(@pack==pointer).pout[k].@pres;
				obj.uid = uidC;
				uidC++;
				tileCon.push(obj);
			}
			for(k=0;k<int(data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil.length());k++){
				obj = new Object();
				obj.p1 = data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil[k].@p1;
				obj.p2 = data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil[k].@p2;
				obj.col = data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil[k].@col;
				filterList.push(obj);
				var f:Filter = new Filter();
				f.setFCol(data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil[k].@col);
				f.x = tiles[obj.p1].x;
				f.y = tiles[obj.p1].y;
				f.scaleX = (tW/110);
				f.scaleY = (tW/110);
				if(data.puzzle.(@id==puzzlePointer).(@pack==pointer).fil[k].@dir == "V"){
					f.y+=tW;
					f.rotation = 0;
				}else{
					f.x+=tW;
					f.rotation = 90;
				}
				ui.addChild(f);
				filterObjects.push(f);
			}
			if(pass == false){
				createTileActual(w);
			}
			stage.addEventListener(Event.ENTER_FRAME, uiRenderNicer);
		}
		private function runUI():void{
			ui.openMenu.addEventListener(MouseEvent.CLICK, animInterfaceToUIMenu);
			ui.simBtn.addEventListener(MouseEvent.CLICK,runSim);
			for(var j:int = 0;j<tiles.length;j++){
				tiles[j].addEventListener(MouseEvent.CLICK, modTile);
			}
			
			// Add Bot  (hammer) Functions AND MAKE THE WRENCH FUNCTIONS RESET
			for(var i:int=0;i<inoutSyms.length;i++){
				inoutSyms[i].addEventListener(MouseEvent.CLICK, displayInputData); // FIX THIS AND MOVE SOMEWHERE ELSE, THEN ADD IT TO STOP UI, THEN ADD THE FILTER VERSION OF TTS
			}
			for(i = 0;i<filterObjects.length;i++){
				filterObjects[i].addEventListener(MouseEvent.CLICK, displayFilterData);
			}
			if(tabState == "hammer"){
				for(i = 0;i<pipeBtns.length;i++){
					pipeBtns[i].addEventListener(MouseEvent.MOUSE_DOWN, pullTile);
				}
				ui.tabs.topTab.addEventListener(MouseEvent.CLICK,switchToTop);
			}else{
				ui.tabs.botTab.addEventListener(MouseEvent.CLICK, switchToBot);
				for(i = 0;i<15;i++){
					if(i != 6 && i != 8){
						pipeBtns[i].addEventListener(MouseEvent.MOUSE_DOWN, pullColorLabel);
					}else if(i == 6){
						pipeBtns[i].addEventListener(MouseEvent.MOUSE_DOWN, pullPresInc);
					}else if(i == 8){
						pipeBtns[i].addEventListener(MouseEvent.MOUSE_DOWN, pullPresDec);
					}
				}
			}
		}
		private function stopUI():void{
			ui.openMenu.removeEventListener(MouseEvent.CLICK, animInterfaceToUIMenu);
			ui.simBtn.removeEventListener(MouseEvent.CLICK,runSim);
			for(var i:int = 0;i<tiles.length;i++){
				tiles[i].removeEventListener(MouseEvent.CLICK, modTile);
			}
			for(i=0;i<inoutSyms.length;i++){
				inoutSyms[i].removeEventListener(MouseEvent.CLICK, displayInputData); // FIX THIS AND MOVE SOMEWHERE ELSE, THEN ADD IT TO STOP UI, THEN ADD THE FILTER VERSION OF TTS
			}
			for(i = 0;i<filterObjects.length;i++){
				filterObjects[i].removeEventListener(MouseEvent.CLICK, displayFilterData);
			}
			if(tabState == "hammer"){
				for(i=0;i<pipeBtns.length;i++){
					pipeBtns[i].removeEventListener(MouseEvent.MOUSE_DOWN, pullTile);
				}
			}else if(tabState == "wrench"){
				for(i=0;i<pipeBtns.length;i++){
					if(i == 6){
						pipeBtns[i].removeEventListener(MouseEvent.MOUSE_DOWN, pullPresInc);
					}else if(i == 8){
						pipeBtns[i].removeEventListener(MouseEvent.MOUSE_DOWN, pullPresDec);
					}else{
						pipeBtns[i].removeEventListener(MouseEvent.MOUSE_DOWN, pullColorLabel);
					}
				}
			}
			for(i=0;i<inoutSyms.length;i++){
				inoutSyms[i].addEventListener(MouseEvent.CLICK, displayInputData);
			}
			stage.removeEventListener(Event.ENTER_FRAME, uiRenderNicer);
		}
		private function clickToUI(e:MouseEvent):void{
			anim = "click-to-ui";
			animT = 0;
			stage.removeEventListener(MouseEvent.CLICK, clickToUI);
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		
		private function switchToTop(e:MouseEvent):void{
			// Remove Bot (hammer) Functions / Things
			for(var i:int = pipeBtns.length-1;i>=0;i--){
				pipeBtns[i].removeEventListener(MouseEvent.MOUSE_DOWN, pullTile);
				ui.removeChild(pipeBtns[i]);
			}
			pipeBtns = new Array();
			ui.tabs.topTab.removeEventListener(MouseEvent.CLICK, switchToTop);
			
			ui.tabs.gotoAndStop(2);
			// Add Top (wrench) Functions / Things
			ui.tabs.botTab.addEventListener(MouseEvent.CLICK, switchToBot);
			tabState = "wrench";
			for(i = 0;i<15;i++){
				if(i != 6 && i != 8){
					var p:ColSym = new ColSym();
					p.x = 10 + Math.floor(i/3)*(p.width+8);
					p.y = 10 + (i%3)*(p.height+8);
					p.gotoAndStop(i+1 - Math.min(1,Math.floor(i/6)) - Math.min(1,Math.floor(i/8)));
					p.addEventListener(MouseEvent.MOUSE_DOWN, pullColorLabel);
					ui.tabs.addChild(p);
					pipeBtns.push(p);
				}else{
					var p2:PreSym = new PreSym();
					p2.x = 10 + Math.floor(i/3)*(p2.width+8);
					p2.y = 10 + (i%3)*(p2.height+8);
					p2.gotoAndStop((i-6)/2+1);
					ui.tabs.addChild(p2);
					if(i == 6){
						p2.addEventListener(MouseEvent.MOUSE_DOWN, pullPresInc);
					}else if(i == 8){
						p2.addEventListener(MouseEvent.MOUSE_DOWN, pullPresDec);
					}
					pipeBtns.push(p2);
				}
			}
		}
		private function switchToBot(e:MouseEvent):void{
			// Remove Top (wrench) Functions
			for(var j:int = pipeBtns.length-1;j>=0;j--){
				pipeBtns[j].removeEventListener(MouseEvent.MOUSE_DOWN, pullColorLabel);
				ui.tabs.removeChild(pipeBtns[j])
			}
			pipeBtns = new Array();
			ui.tabs.botTab.removeEventListener(MouseEvent.CLICK, switchToBot);
			ui.tabs.gotoAndStop(1);
			// Add Bot (hammer) Functions
			for(j = 0;j<8;j++){
				var s:PipeButton = new PipeButton();
				s.x = 13+(j%4)*55+ui.tabs.x;
				s.y = 13+(Math.floor(j/4))*55+ui.tabs.y;
				s.pipe.gotoAndStop(j+1);
				//s.pipe.scaleX = 50/110;
				//s.pipe.scaleY = 50/110;
				ui.addChild(s);
				pipeBtns.push(s);
				s.addEventListener(MouseEvent.MOUSE_DOWN, pullTile);
			}
			ui.tabs.topTab.addEventListener(MouseEvent.CLICK, switchToTop);
			tabState = "hammer";
		}
		
		private function pullTile(e:MouseEvent):void{
			for(var i:int = 0;i<pipeBtns.length;i++){
				if(e.currentTarget == pipeBtns[i]){
					break;
				}
			}
			tile = new PipeButton();
			tile.x = mouseX-25;
			tile.y = mouseY-25;
			tile.pipe.gotoAndStop(i+1);
			//tile.pipe.scaleX = 50/110;
			//tile.pipe.scaleY = 50/110;
			addChild(tile);
			tileSel = i+1;
			tile.startDrag();
			
			stage.addEventListener(MouseEvent.MOUSE_UP, dropTile);
			
			pauseTileEvents();
		}
		private function dropTile(e:MouseEvent):void{
			tile.stopDrag();
			removeChild(tile);
			var seti:int = -1;
			var setd:int = 50;
			for(var i:int = 0;i<tiles.length;i++){
				if(setd>Math.sqrt(Math.pow(tile.x-tiles[i].x-tW/4,2)+Math.pow(tile.y-tiles[i].y-tW/4,2))){
					setd = Math.sqrt(Math.pow(tile.x-tiles[i].x-tW/4,2)+Math.pow(tile.y-tiles[i].y-tW/4,2));
					seti = i;
				}
			}
			if(seti != -1){
				tiles[seti].pipe.gotoAndStop(tileSel); // RESET ROTATION OF THE TILE FROM PREVIOUS (anim, not other)
				tiles[seti].pipe.resetRotation();
				setTile(seti,tileSel);
			}
			stage.removeEventListener(MouseEvent.MOUSE_UP, dropTile);
			resumeTileEvents();
		}
		
		private function pullColorLabel(e:MouseEvent):void{
			for(var i:int = 0;i<pipeBtns.length;i++){
				if(e.currentTarget == pipeBtns[i]){
					break;
				}
			}
			clabel = new ColSym();
			clabel.x = mouseX-clabel.width/2;
			clabel.y = mouseY-clabel.height/2;
			clabel.gotoAndStop(e.currentTarget.currentFrame);
			addChild(clabel);
			clabel.startDrag();
			currentCol = clabel.currentFrameLabel;
			
			stage.addEventListener(MouseEvent.MOUSE_UP, dropColorLabel);
			pauseTileEvents();
		}
		private function dropColorLabel(e:MouseEvent):void{
			for(var i:int = 0;i<tileActual.length;i++){
				if(tileActual[i] != null){
					if(tileActual[i].tile == 1 || tileActual[i].tile == 2){ // everywhere there is a break do the thing
						if(tiles[i].pipe.hitTestPoint(mouseX,mouseY)){
							tileActual[i].col = currentCol;
							tiles[i].pipe.lab.setCol(currentCol);
							recursive("C",i,"main");
							break;
						}
					}else if(tileActual[i].tile == 3){
						if(tiles[i].pipe.main.hitTestPoint(mouseX,mouseY)){
							tileActual[i].colH = currentCol;
							tiles[i].pipe.lab.setHCol(currentCol);
							recursive("C",i,"H");
							break;
						}else if(tiles[i].pipe.side.hitTestPoint(mouseX,mouseY)){
							tileActual[i].colV = currentCol;
							tiles[i].pipe.lab.setVCol(currentCol);
							recursive("C",i,"V");
							break;
						}
					}else if(tileActual[i].tile >= 4){
						if(tiles[i].pipe.leftPipe.hitTestPoint(mouseX,mouseY)){
							tileActual[i].colL = currentCol;
							tiles[i].pipe.lab.setLCol(currentCol);
							recursive("C",i,"L");
							break;
						}else if(tiles[i].pipe.midPipe.hitTestPoint(mouseX,mouseY)){
							tileActual[i].colM = currentCol;
							tiles[i].pipe.lab.setMCol(currentCol);
							recursive("C",i,"M");
							break;
						}else if(tiles[i].pipe.rightPipe.hitTestPoint(mouseX,mouseY)){
							tileActual[i].colR = currentCol;
							tiles[i].pipe.lab.setRCol(currentCol);
							recursive("C",i,"R");
							break;
						}
					}
				}
			}
			currentCol = "";
			
			// Call color spreading function on pipe that you touched. 
			
			// runColorChange(tileNum, type (main, behind, left, right, middle), color)
			// runPressureChange(tileNum, type, pressure)
			
			stage.removeEventListener(MouseEvent.MOUSE_UP, dropColorLabel);
			resumeTileEvents();
			clabel.stopDrag();
			removeChild(clabel);
		}
		
		private function pullPresInc(e:MouseEvent):void{
			currentPre = 1;
			pullPres(1);
		}
		private function pullPresDec(e:MouseEvent):void{
			currentPre = -1;
			pullPres(2);
		}
		private function pullPres(fram:int):void{
			plabel = new PreSym();
			plabel.x = mouseX-plabel.width/2;
			plabel.y = mouseY-plabel.height/2;
			plabel.gotoAndStop(fram);
			addChild(plabel);
			plabel.startDrag();
			
			stage.addEventListener(MouseEvent.MOUSE_UP, dropPreLabel);
			pauseTileEvents();
			
		}
		private function dropPreLabel(e:MouseEvent):void{
			for(var i:int = 0;i<tileActual.length;i++){
				if(tileActual[i] != null){
					if(tileActual[i].tile == 1 || tileActual[i].tile == 2){ // everywhere there is a break do the thing
						if(tiles[i].pipe.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].pre+currentPre!=0 && tileActual[i].pre+currentPre!=5){
								tileActual[i].pre += currentPre;
								tiles[i].pipe.pre.setPre(currentPre);
								currentPre = tileActual[i].pre;
								recursive("P",i,"main");
								break;
							}
						}
					}else if(tileActual[i].tile == 3){
						if(tiles[i].pipe.main.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].preH+currentPre!=0 && tileActual[i].preH+currentPre!=5){
								tileActual[i].preH += currentPre;
								tiles[i].pipe.pre.setHPre(currentPre);
								currentPre = tileActual[i].preH;
								recursive("P",i,"H");
								break;
							}
						}else if(tiles[i].pipe.side.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].preV+currentPre!=0 && tileActual[i].preV+currentPre!=5){
								tileActual[i].preV += currentPre;
								tiles[i].pipe.pre.setVPre(currentPre);
								currentPre = tileActual[i].preV;
								recursive("P",i,"V");
								break;
							}
						}
					}else if(tileActual[i].tile >= 4){
						if(tiles[i].pipe.leftPipe.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].preL+currentPre!=0 && tileActual[i].preL+currentPre!=5){
								tileActual[i].preL += currentPre;
								tiles[i].pipe.pre.setLPre(currentPre);
								currentPre = tileActual[i].preL;
								recursive("P",i,"L");
								break;
							}
						}else if(tiles[i].pipe.midPipe.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].preM+currentPre!=0 && tileActual[i].preM+currentPre!=5){
								tileActual[i].preM += currentPre;
								tiles[i].pipe.pre.setMPre(currentPre);
								currentPre = tileActual[i].preM;
								recursive("P",i,"M");
								break;
							}
						}else if(tiles[i].pipe.rightPipe.hitTestPoint(mouseX,mouseY)){
							if(tileActual[i].preR+currentPre!=0 && tileActual[i].preR+currentPre!=5){
								tileActual[i].preR += currentPre;
								tiles[i].pipe.pre.setRPre(currentPre);
								currentPre = tileActual[i].preR;
								recursive("P",i,"R");
								break;
							}
						}
					}
				}
			}
			currentPre = 0;
			stage.removeEventListener(MouseEvent.MOUSE_UP, dropPreLabel);
			resumeTileEvents();
			plabel.stopDrag();
			removeChild(plabel);
		}
		
		// Tooltips
		
		private function displayInputData(e:MouseEvent):void{
			if(iTxt.alpha == 0){
				addChild(iTxt);
				stage.addEventListener(Event.ENTER_FRAME, inputRender);
				stage.addEventListener(MouseEvent.CLICK, cancelInputData);
			}
			for(var i:int = 0;i<inoutSyms.length;i++){
				if(e.currentTarget == inoutSyms[i]){
					break;
				}
			}
			iTxt.gotoAndStop(1);
			tooltipT = 0;
			iTxt.alpha = 0;
			if(inoutSyms[i].currentFrame == 1){
				iTxt.title.text = "Input Selected";
			}else{
				iTxt.title.text = "Output Selected";
			}
			switch(inoutSyms[i].pre.currentFrame){
				case 1:
					iTxt.disp.text = "Low (x1)";
					break;
				case 2:
					iTxt.disp.text = "Med. (x2)";
					break;
				case 3:
					iTxt.disp.text = "High (x3)";
					break;
				case 4:
					iTxt.disp.text = "Ext. (x4)";
					break;
			}
			iTxt.disp.appendText("\n"+sL(inoutSyms[i].anim.currentFrameLabel)[0]);
			iTxt.disp2.text = sL(inoutSyms[i].anim.currentFrameLabel)[1];
		}
		private function displayFilterData(e:MouseEvent):void{
			if(iTxt.alpha == 0){
				addChild(iTxt);
				stage.addEventListener(Event.ENTER_FRAME, inputRender);
				stage.addEventListener(MouseEvent.CLICK, cancelInputData);
			}
			for(var i:int = 0;i<filterObjects.length;i++){
				if(e.currentTarget == filterObjects[i]){
					break;
				}
			}
			tooltipT = 0;
			iTxt.alpha = 0;
			iTxt.gotoAndStop(2);
			iTxt.title.text = "Filter Selected";
			iTxt.disp.text = sL(filterList[i].col)[0];
			iTxt.disp2.text = sL(filterList[i].col)[1];
		}
		private function inputRender(e:Event){
			if(tooltipT<10){
				iTxt.alpha+=0.1;
			}else if(tooltipT == 10){
				iTxt.alpha == 1;
			}else if(tooltipT >tt && tooltipT<tt+20){
				iTxt.alpha-=0.05;
			}else if(tooltipT == tt+20){
				iTxt.alpha = 0;
				removeChild(iTxt);
				stage.removeEventListener(Event.ENTER_FRAME, inputRender);
				stage.removeEventListener(MouseEvent.CLICK, cancelInputData);
			}
			tooltipT++;
		}
		private function cancelInputData(e:MouseEvent):void{
			if(tooltipT<tt && tooltipT !=0){
				tooltipT = tt;
			}
		}
		
		// Recursive Functions
		
		private function recursive(mainType:String,i:int,part:String):void{
			var ac:Array = new Array();
			var ac2:Array = new Array();
			var list:Array = new Array();
			var p1:String = part;
			// USE i AND part TO TURN LMR to NESW
			if(p1 == "L" || p1 == "M" || p1 == "R"){
				p1 = convertToCard(p1,i);
			}
			ac = recurse(p1,i,mainType);
			
			while(true){
				ac2 = new Array();
				for(var j:int = 0;j<ac.length;j++){
					list = new Array();
					list = recurse(ac[j].cont,ac[j].pos,mainType);
					//ac2 = new Array();
					for(var k:int = list.length-1;k>=0;k--){
						ac2.push(list.pop());
					}
				}
				ac = new Array();
				ac = ac2.slice();
				if(ac.length == 0){
					break;
				}
			}
			// fill ac with actions
			//while true:
			// run ac simply and color what is there
			// remove ac if it runs into something
		}
		private function recurse(typ:String,i:int,style:String):Array{
			var o:Object = new Object();
			var l:Array = new Array();
			if(typ == "main" || typ == "V" || typ == "N"){ // Testing the north connection
				if(connectDir("N",tileActual[i])==true && connectDir("S",tileActual[i-w])==true && realTilePos(i,"N")==true && (filterCheck(i-w,i)==false || style == "P")){
					if(tileActual[i-w].tile == 1 || tileActual[i-w].tile == 2){
						if((tileActual[i-w].col != currentCol && style=="C") || (style=="P" && tileActual[i-w].pre != currentPre)){
							o.pos = i-w;
							o.cont = "main";
							if(style == "C"){
								tileActual[i-w].col = currentCol;
								tiles[i-w].pipe.lab.setCol(currentCol);
							}else if(style == "P"){
								tileActual[i-w].pre = currentPre;
								tiles[i-w].pipe.pre.setAcPre(currentPre); // ADD setAcPre on all pre parts, then fill this in recursive, pressure labeling complete
							}
							l.push(o);
						}
					}else if(tileActual[i-w].tile == 3){
						if((tileActual[i-w].colV != currentCol && style == "C") || (style=="P" && tileActual[i-w].preV != currentPre)){
							o.pos = i-w;
							o.cont = "V";
							if(style == "C"){
								tileActual[i-w].colV = currentCol;
								tiles[i-w].pipe.lab.setVCol(currentCol);
							}else if(style == "P"){
								tileActual[i-w].preV = currentPre;
								tiles[i-w].pipe.pre.setAcVPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i-w].tile >= 4){
						if(tileActual[i-w].rot == "xN"){
							if(style == "C"){
								tileActual[i-w].colM = currentCol;
								tiles[i-w].pipe.lab.setMCol(currentCol);
							}else if(style == "P"){
								tileActual[i-w].preM = currentPre;
								tiles[i-w].pipe.pre.setAcMPre(currentPre);
							}
						}else if(tileActual[i-w].rot == "xE"){
							if(style == "C"){
								tileActual[i-w].colL = currentCol;
								tiles[i-w].pipe.lab.setLCol(currentCol);
							}else if(style == "P"){
								tileActual[i-w].preL = currentPre;
								tiles[i-w].pipe.pre.setAcLPre(currentPre);
							}
						}else if(tileActual[i-w].rot == "xW"){
							if(style == "C"){
								tileActual[i-w].colR = currentCol;
								tiles[i-w].pipe.lab.setRCol(currentCol);
							}else if(style == "P"){
								tileActual[i-w].preR = currentPre;
								tiles[i-w].pipe.pre.setAcRPre(currentPre);
							}
						}
					}
				}
			}
			o = new Object();
			if(typ == "main" || typ == "V" || typ == "S"){
				if(connectDir("S",tileActual[i])==true && connectDir("N",tileActual[i+w])==true && realTilePos(i,"S") && (filterCheck(i,i+w)==false || style == "P")){
					if(tileActual[i+w].tile == 1 || tileActual[i+w].tile == 2){
						if((tileActual[i+w].col != currentCol && style=="C") || (tileActual[i+w].pre != currentPre && style=="P")){
							o.pos = i+w;
							o.cont = "main";
							if(style == "C"){
								tileActual[i+w].col = currentCol;
								tiles[i+w].pipe.lab.setCol(currentCol);
							}else if(style == "P"){
								tileActual[i+w].pre = currentPre;
								tiles[i+w].pipe.pre.setAcPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i+w].tile == 3){
						if((tileActual[i+w].colV != currentCol && style=="C") || (style=="P" && tileActual[i+w].preV != currentPre)){
							o.pos = i+w;
							o.cont = "V";
							if(style == "C"){
								tileActual[i+w].colV = currentCol;
								tiles[i+w].pipe.lab.setVCol(currentCol);
							}else if(style == "P"){
								tileActual[i+w].preV = currentPre;
								tiles[i+w].pipe.pre.setAcVPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i+w].tile >= 4){
						if(tileActual[i+w].rot == "xS"){
							if(style == "C"){
								tileActual[i+w].colM = currentCol;
								tiles[i+w].pipe.lab.setMCol(currentCol);
							}else if(style == "P"){
								tileActual[i+w].preM = currentPre;
								tiles[i+w].pipe.pre.setAcMPre(currentPre);
							}
						}else if(tileActual[i+w].rot == "xE"){
							if(style == "C"){
								tileActual[i+w].colR = currentCol;
								tiles[i+w].pipe.lab.setRCol(currentCol);
							}else if(style == "P"){
								tileActual[i+w].preR = currentPre;
								tiles[i+w].pipe.pre.setAcRPre(currentPre);
							}
						}else if(tileActual[i+w].rot == "xW"){
							if(style == "C"){
								tileActual[i+w].colL = currentCol;
								tiles[i+w].pipe.lab.setLCol(currentCol);
							}else if(style == "P"){
								tileActual[i+w].preL = currentPre;
								tiles[i+w].pipe.pre.setAcLPre(currentPre);
							}
						}
					}
				}
			}
			o = new Object();
			if(typ == "main" || typ == "H" || typ == "E"){
				if(connectDir("E",tileActual[i])==true && connectDir("W",tileActual[i+1])==true && realTilePos(i,"E")==true && (filterCheck(i,i+1)==false || style == "P")){
					if(tileActual[i+1].tile == 1 || tileActual[i+1].tile == 2){
						if((tileActual[i+1].col != currentCol && style == "C") || (style == "P" && tileActual[i+1].pre != currentPre)){
							o.pos = i+1;
							o.cont = "main";
							if(style == "C"){
								tileActual[i+1].col = currentCol;
								tiles[i+1].pipe.lab.setCol(currentCol);
							}else if(style == "P"){
								tileActual[i+1].pre = currentPre;
								tiles[i+1].pipe.pre.setAcPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i+1].tile == 3){
						if((tileActual[i+1].colH != currentCol && style == "C") || (style == "P" && tileActual[i+1].preH != currentPre)){
							o.pos = i+1;
							o.cont = "H";
							if(style == "C"){
								tileActual[i+1].colH = currentCol;
								tiles[i+1].pipe.lab.setHCol(currentCol);
							}else if(style == "P"){
								tileActual[i+1].preH = currentPre;
								tiles[i+1].pipe.pre.setAcHPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i+1].tile >= 4){
						if(tileActual[i+1].rot == "xS"){
							if(style == "C"){
								tileActual[i+1].colL = currentCol;
								tiles[i+1].pipe.lab.setLCol(currentCol);
							}else if(style == "P"){
								tileActual[i+1].preL = currentPre;
								tiles[i+1].pipe.pre.setAcLPre(currentPre);
							}
						}else if(tileActual[i+1].rot == "xN"){
							if(style == "C"){
								tileActual[i+1].colR = currentCol;
								tiles[i+1].pipe.lab.setRCol(currentCol);
							}else if(style == "P"){
								tileActual[i+1].preR = currentPre;
								tiles[i+1].pipe.pre.setAcRPre(currentPre);
							}
						}else if(tileActual[i+1].rot == "xE"){
							if(style == "C"){
								tileActual[i+1].colM = currentCol;
								tiles[i+1].pipe.lab.setMCol(currentCol);
							}else if(style == "P"){
								tileActual[i+1].preM = currentPre;
								tiles[i+1].pipe.pre.setAcMPre(currentPre);
							}
						}
					}
				}
			}
			o = new Object();
			if(typ == "main" || typ == "H" || typ == "W"){
				if(connectDir("W",tileActual[i])==true && connectDir("E",tileActual[i-1])==true && realTilePos(i,"W")==true && (filterCheck(i-1,i)==false || style == "P")){
					if(tileActual[i-1].tile == 1 || tileActual[i-1].tile == 2){
						if((tileActual[i-1].col != currentCol && style == "C") || (style == "P" && tileActual[i-1].pre != currentPre)){
							o.pos = i-1;
							o.cont = "main";
							if(style == "C"){
								tileActual[i-1].col = currentCol;
								tiles[i-1].pipe.lab.setCol(currentCol);
							}else if(style == "P"){
								tileActual[i-1].pre = currentPre;
								tiles[i-1].pipe.pre.setAcPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i-1].tile == 3){
						if((tileActual[i-1].colH != currentCol && style == "C") || (style == "P" && tileActual[i-1].preH != currentPre)){
							o.pos = i-1;
							o.cont = "H";
							if(style == "C"){
								tileActual[i-1].colH = currentCol;
								tiles[i-1].pipe.lab.setHCol(currentCol);
							}else if(style == "P"){
								tileActual[i-1].preH = currentPre;
								tiles[i-1].pipe.pre.setAcHPre(currentPre);
							}
							l.push(o);
						}
					}else if(tileActual[i-1].tile >= 4){
						if(tileActual[i-1].rot == "xS"){
							if(style == "C"){
								tileActual[i-1].colR = currentCol;
								tiles[i-1].pipe.lab.setRCol(currentCol);
							}else if(style == "P"){
								tileActual[i-1].preR = currentPre;
								tiles[i-1].pipe.pre.setAcRPre(currentPre);
							}
						}else if(tileActual[i-1].rot == "xN"){
							if(style == "C"){
								tileActual[i-1].colL = currentCol;
								tiles[i-1].pipe.lab.setLCol(currentCol);
							}else if(style == "P"){
								tileActual[i-1].preL = currentPre;
								tiles[i-1].pipe.pre.setAcLPre(currentPre);
							}
						}else if(tileActual[i-1].rot == "xW"){
							if(style == "C"){
								tileActual[i-1].colM = currentCol;
								tiles[i-1].pipe.lab.setMCol(currentCol);
							}else if(style == "P"){
								tileActual[i-1].preM = currentPre;
								tiles[i-1].pipe.pre.setAcMPre(currentPre);
							}
						}
					}
				}
			}
			return(l);
		}
		private function convertToCard(side:String,i:int):String{
			if((side == "M" && tileActual[i].rot == "xS") || (side == "R" && tileActual[i].rot == "xE") || (side == "L" && tileActual[i].rot == "xW")){
				return("N");
			}else if((side == "M" && tileActual[i].rot == "xN") || (side == "R" && tileActual[i].rot == "xW") || (side == "L" && tileActual[i].rot == "xE")){
				return("S");
			}else if((side == "M" && tileActual[i].rot == "xW") || (side == "R" && tileActual[i].rot == "xS") || (side == "L" && tileActual[i].rot == "xN")){
				return("E");
			}else if((side == "M" && tileActual[i].rot == "xE") || (side == "R" && tileActual[i].rot == "xN") || (side == "L" && tileActual[i].rot == "xS")){
				return("W");
			}
			return("FLIBBYJABBER")
		}
		private function filterCheck(low:int,high:int):Boolean{
			for(var i:int = 0;i<filterList.length;i++){
				if(filterList[i].p1 == low && filterList[i].p2 == high){
					return(true);
				}
			}
			return(false);
		}
		
		private function modTile(e:MouseEvent):void{
			for(var i:int = 0;i<tiles.length;i++){
				if(tiles[i] == e.currentTarget){
					break;
				}
			}
			if(tileActual[i]!=null){
				if(tileActual[i].tile!=3){
					tileActual[i].rot = tiles[i].pipe.rotatePipe()
				}
			}
		}
		
		private function pauseTileEvents(){
			for(var i:int = 0;i<tiles.length;i++){
				tiles[i].removeEventListener(MouseEvent.CLICK, modTile);
			}
		}
		private function resumeTileEvents(){
			for(var i:int = 0;i<tiles.length;i++){
				tiles[i].addEventListener(MouseEvent.CLICK, modTile);
			}
		}
		
		// UI Menu Screen
		
		private function runUIMenuScreen():void{
			uiMenu.exitBtn.addEventListener(MouseEvent.CLICK, animUIMenuToPuzzle);
			uiMenu.resBtn.addEventListener(MouseEvent.CLICK, animUIMenuToInterface);
			uiMenu.optBtn.addEventListener(MouseEvent.CLICK, animOpenOptions);
		}
		private function stopUIMenuScreen():void{
			uiMenu.exitBtn.removeEventListener(MouseEvent.CLICK, animUIMenuToPuzzle);
			uiMenu.resBtn.removeEventListener(MouseEvent.CLICK, animUIMenuToInterface);
			uiMenu.optBtn.removeEventListener(MouseEvent.CLICK, animOpenOptions);
		}
		
		// Options Menu
		
		private function runOptions():void{
			oScreen.leftBtn.addEventListener(MouseEvent.CLICK, cycleOptLeft);
			oScreen.rightBtn.addEventListener(MouseEvent.CLICK, cycleOptRight);
			oScreen.backBtn.addEventListener(MouseEvent.CLICK, animCloseOptions);
			oScreen.musicTog.addEventListener(MouseEvent.CLICK, toggleMusic);
			oScreen.tutorialTog.addEventListener(MouseEvent.CLICK, toggleTutorial);
			oScreen.ttTog.addEventListener(MouseEvent.CLICK, toggleTooltips);
		}
		private function stopOptions():void{
			oScreen.leftBtn.removeEventListener(MouseEvent.CLICK, cycleOptLeft);
			oScreen.rightBtn.removeEventListener(MouseEvent.CLICK, cycleOptRight);
			oScreen.backBtn.removeEventListener(MouseEvent.CLICK, animCloseOptions);
			if(oScreen.currentFrame == 1){
				oScreen.musicTog.removeEventListener(MouseEvent.CLICK, toggleMusic);
				oScreen.tutorialTog.removeEventListener(MouseEvent.CLICK, toggleTutorial);
				oScreen.ttTog.removeEventListener(MouseEvent.CLICK, toggleTooltips);
			}
		}
		
		private function cycleOptLeft(e:MouseEvent):void{
			if(oScreen.currentFrame!=1){
				oScreen.gotoAndStop(oScreen.currentFrame-1);
			}
			if(oScreen.currentFrame == 1){
				oScreen.musicTog.addEventListener(MouseEvent.CLICK, toggleMusic);
				oScreen.tutorialTog.addEventListener(MouseEvent.CLICK, toggleTutorial);
				oScreen.ttTog.addEventListener(MouseEvent.CLICK, toggleTooltips);
				if(tutTog == true){
					oScreen.tutorialTog.gotoAndStop(1);
				}else{
					oScreen.tutorialTog.gotoAndStop(2);
				}
				if(musTog == true){
					oScreen.musicTog.gotoAndStop(1);
				}else{
					oScreen.musicTog.gotoAndStop(2);
				}
			}
		}
		private function cycleOptRight(e:MouseEvent):void{
			if(oScreen.currentFrame == 1){
				oScreen.musicTog.removeEventListener(MouseEvent.CLICK, toggleMusic);
				oScreen.tutorialTog.removeEventListener(MouseEvent.CLICK, toggleTutorial);
				oScreen.ttTog.removeEventListener(MouseEvent.CLICK, toggleTooltips);
			}
			if(oScreen.currentFrame!=3){
				oScreen.gotoAndStop(oScreen.currentFrame+1);
			}
		}
		private function toggleTutorial(e:MouseEvent):void{
			if(tutTog == false){
				tutTog = true;
				oScreen.tutorialTog.gotoAndStop(1);
			}else{
				tutTog = false;
				oScreen.tutorialTog.gotoAndStop(2);
			}
			saveGame.data.tutPref = tutTog;
			saveGame.flush();
		}
		private function toggleMusic(e:MouseEvent):void{
			if(musTog == false){
				musTog = true;
				playing = true;
				oScreen.musicTog.gotoAndStop(1);
				channel = musicList[currentSong].play(lastPos);
				channel.addEventListener(Event.SOUND_COMPLETE, replay);
			}else{
				musTog = false;
				playing = false;
				oScreen.musicTog.gotoAndStop(2);
				channel.removeEventListener(Event.SOUND_COMPLETE, replay);
				lastPos = channel.position;
				channel.stop();
			}
			saveGame.data.musPref = musTog;
			saveGame.flush();
		}
		private function toggleTooltips(e:MouseEvent):void{
			if(tt == 50){
				tt = 110;
				oScreen.ttTog.gotoAndStop(2);
			}else if(tt == 110){
				tt = 50;
				oScreen.ttTog.gotoAndStop(1);
			}
			saveGame.data.ttPref = tt;
			saveGame.flush();
		}
		
		// Algorithym Functions
		
		private function createTileActual(w:int):void{
			tileActual = new Array(Math.pow(w,2));
		}
		private function setTile(pos:int,st:int):void{
			if(st!=0){
				var obj:Object = new Object;
				obj.tile = st-1; // 1:Straight, 2:Curve, 3:Crossover, 4:Add, 5:Subtract, 6:Pressure, 7:Depressure
				obj.rot = "BASIC";
				// Set Rotated Tile from BASIC to tile DEFAULT
				if(st == 2){
					obj.rot = "H";
					obj.col = "ALL";
					obj.pre = 1;
				}else if(st == 3){
					obj.rot = "NE";
					obj.col = "ALL";
					obj.pre = 1;
				}else if(st == 4){
					obj.colV = "ALL";
					obj.colH = "ALL";
					obj.preV = 1;
					obj.preH = 1;
				}else if(st >= 5){
					obj.rot = "xW";
					obj.colL = "ALL";
					obj.colM = "ALL";
					obj.colR = "ALL";
					obj.preL = 1;
					obj.preM = 1;
					obj.preR = 1;
				}
				tileActual[pos] = obj; // Access TileActual via tileActual[pos]
			}else{
				tileActual[pos] = null;
			}
		}
		
		private function generateInitialAction(pos:int, colData:String):Object{
			var o:Object = new Object
			if(pos<w){ // ON 3x3: pos=0,1,2 TOP Position  | G = I, dir=S
				o.pos = pos;
				o.dir = "S";
			}else if(pos<2*w){ // ON 3x3: pos=3,4,5 RIGHT Position | G = wI -w^2 +w -1, dir=W
				o.pos = w*pos - w*w + w - 1;
				o.dir = "W";
			}else if(pos<3*w){ // ON 3x3: pos=6,7,8: BOT Position | G = -I + w^2 +2w -1, dir=N
				o.pos = -pos + w*w + 2*w - 1;
				o.dir = "N";
			}else if(pos<4*w){ // ON 3x3: pos=9,10,11 LEFT Position | G = -wI + 4w^2-w, dir=E
				o.pos = -w*pos + 4*w*w - w;
				o.dir = "E";
			}
			o.col = c(colData);
			return(o);
		}
		private function generateTileCon(pos:int, colData:String):Object{
			var o:Object = new Object
			if(pos<w){ // ON 3x3: pos=0,1,2 TOP Position  | G = I, dir=N
				o.pos = pos;
				o.dir = "N";
			}else if(pos<2*w){ // ON 3x3: pos=3,4,5 RIGHT Position | G = wI -w^2 +w -1, dir=E
				o.pos = w*pos - w*w + w - 1;
				o.dir = "E";
			}else if(pos<3*w){ // ON 3x3: pos=6,7,8: BOT Position | G = -I + w^2 +2w -1, dir=S
				o.pos = -pos + w*w + 2*w - 1;
				o.dir = "S";
			}else if(pos<4*w){ // ON 3x3: pos=9,10,11 LEFT Position | G = -wI + 4w^2-w, dir=W
				o.pos = -w*pos + 4*w*w - w;
				o.dir = "W";
			}
			o.col = c(colData);
			return(o);
		}
		
		private function realTilePos(pos:Number,dir:String):Boolean{ // Takes argument of CURRENT pos and NEXT dir
			var w:Number = data.pack.itm.(@id==pointer).@size;
			if(pos<w){ // ON 3x3: pos=0,1,2 TOP Position  | G = I, dir=S
				if(dir == "N"){
					return(false);
				}
			}
			if((pos+1)/w is int){ // ON 3x3: pos=3,4,5 RIGHT Position | G = wI -w^2 +w -1, dir=W
				if(dir == "E"){
					return(false);
				}
			}
			if(pos>=(w*w-w)){ // ON 3x3: pos=6,7,8: BOT Position | G = -I + w^2 +2w -1, dir=N
				if(dir == "S"){
					return(false);
				}
			}
			if(pos/w is int){ // ON 3x3: pos=9,10,11 LEFT Position | G = -wI + 4w^2-w, dir=E
				if(dir == "W"){
					return(false);
				}
			}
			return(true)
		}
		private function pushTileCon(pos:int, dir:String, colData:int, preData:int, fast:Boolean = false):Boolean{ // Takes argument of CURRENT pos and NEXT dir
			var solve:Boolean = false;
			for(var i:int = 0;i<tileCon.length;i++){
				if(tileCon[i].dir == dir && tileCon[i].pos == pos && tileCon[i].col == colData && tileCon[i].pre == preData){
					// Find and play animation
					for(var j:int = 0;j<inoutSyms.length;j++){
						if(inoutSyms[j].getUID() == tileCon[i].uid){
							inoutSyms[j].playLater(s(colData),fast);
						}
					}
					tileCon.splice(i,1);
					i--;
					solve = true;
					break;
				}
			}
			return(solve);
		}
		
		private function newMixColAction(arr:Array, omit:String, pos:int):Object{
			var o:Object = new Object;
			var sides:Array = ["L","M","R"];
			
			for(var i:int = 0;i<sides.length;i++){
				if(arr[1] == sides[i] || arr[3] == sides[i]){
					sides.splice(i,1);
					i--;
				}
			}
			o.col = arr[0]*arr[2];
			var list:Array = mechToCard(sides[0],omit,pos);
			o.dir = list[0];
			o.pos = list[1];
			o.pre = 1;
			return(o);
		}
		private function newSepColActions(arr:Array, omit:String, pos:int):Array{
			
			// arr = [COLOR LETTER , DIRECTION LETTER]
			// This function assumes that the colors are correct and will seperate properly
			// out 1/2: directions (LMR) of possible outputs
			// par 1/2: color labels of LMR outputs above
			// list: [out1, out2, par1, par2]
			
			var list:Array;
			if(arr[1] == "L"){
				list = ["M","R",tileActual[pos].colM,tileActual[pos].colR];
			}else if(arr[1] == "M"){
				list = ["L","R",tileActual[pos].colL,tileActual[pos].colR];
			}else if(arr[1] == "R"){
				list = ["L","M",tileActual[pos].colL,tileActual[pos].colM];
			}
			
			if(list[2]=="ALL" && list[3]!="ALL"){
				list[2] = arr[0]/c(list[3]);
				list[3] = c(list[3]);
			}else if(list[2]!="ALL" && list[3]=="ALL"){
				list[3] = arr[0]/c(list[2]);
				list[2] = c(list[2]);
			}else if(list[2] == "ALL" && list[3] == "ALL"){
				// UNDEFINED OUTPUTS ERROR
			}else if(list[2]!="ALL" && list[3]!="ALL"){
				list[2] = c(list[2]);
				list[3] = c(list[3]);
			}
			var plist:Array = new Array();
			var o1:Object = new Object;
			var o2:Object = new Object;
			o1.col = list[2];
			plist = mechToCard(list[0],omit,pos);
			o1.dir = plist[0];
			o1.pos = plist[1];
			o2.col = list[3];
			plist = mechToCard(list[1],omit,pos);
			o2.dir = plist[0];
			o2.pos = plist[1];
			o1.pre = 1;
			o2.pre = 1;
			
			return([list[0],o1,list[1],o2]);
		}
		private function newPresAction(arr:Array, omit:String, pos:int):Object{
			var o:Object = new Object;
			var sides:Array = ["L","M","R"];
			
			for(var i:int = 0;i<sides.length;i++){
				if(arr[1] == sides[i] || arr[4] == sides[i]){
					sides.splice(i,1);
					i--;
				}
			}
			o.col = arr[0];
			var list:Array = mechToCard(sides[0],omit,pos);
			o.dir = list[0];
			o.pos = list[1];
			o.pre = int(arr[2])+int(arr[5]);
			return(o);
		}
		private function newDeprepActions(arr:Array, omit:String, pos:int):Array{
			// arr: COLOR1 - DIR1 - PRES1			
			var o1:Object = new Object();
			var o2:Object = new Object();
			var side1:String = "";
			var side2:String = "";
			
			if(arr[1] == "L"){
				side1 = "M";
				side2 = "R";
				o1.pre = tileActual[pos].preM;
				o2.pre = tileActual[pos].preR;
			}else if(arr[1] == "M"){
				side1 = "R";
				side2 = "L";
				o1.pre = tileActual[pos].preR;
				o2.pre = tileActual[pos].preL;
			}else if(arr[1] == "R"){
				side1 = "L";
				side2 = "M";
				o1.pre = tileActual[pos].preL;
				o2.pre = tileActual[pos].preM;
			}
			var plist:Array = new Array();
			plist = mechToCard(side1,omit,pos);
			o1.dir = plist[0];
			o1.pos = plist[1];
			plist = mechToCard(side2,omit,pos);
			o2.dir = plist[0];
			o2.pos = plist[1];
			
			o1.col = arr[0];
			o2.col = arr[0];
			
			return([side1,o1,side2,o2]);
		}
		
		private function mechToCard(str:String,omit:String,pos:int):Array{
			var arr:Array = new Array();
			if((str=="L" && omit=="xW") || (str=="M" && omit=="xS") || (str=="R" && omit=="xE")){
				arr.push("N",pos-w);
			}else if((str=="L" && omit=="xN") || (str=="M" && omit=="xW") || (str=="R" && omit=="xS")){
				arr.push("E",pos+1);
			}else if((str=="L" && omit=="xE") || (str=="M" && omit=="xN") || (str=="R" && omit=="xW")){
				arr.push("S",pos+w);
			}else if((str=="L" && omit=="xS") || (str=="M" && omit=="xE") || (str=="R" && omit=="xN")){
				arr.push("W",pos-1);
			}
			return(arr);
		}
		
		private function checkSepWork(arr:Array,i:int):Boolean{
			if(arr[0] == 5 || arr[0] == 7 || arr[0] == 11){ // Check: Input Primary
				return(false);
			}
			// Check labeled
			var list:Array;
			if(arr[1] == "L"){ // Check: At least one Label
				if(tileActual[i].colM == "ALL" && tileActual[i].colR == "ALL"){
					return(false);
				}
				list = [tileActual[i].colM,tileActual[i].colR];
			}else if(arr[1] == "M"){
				if(tileActual[i].colL == "ALL" && tileActual[i].colR == "ALL"){
					return(false);
				}
				list = [tileActual[i].colL,tileActual[i].colR];
			}else if(arr[1] == "R"){
				if(tileActual[i].colM == "ALL" && tileActual[i].colL == "ALL"){
					return(false);
				}
				list = [tileActual[i].colM,tileActual[i].colL];
			}
			if(list[1] == "ALL"){
				list.splice(1,1);
			}
			if(list[0] == "ALL"){
				list.splice(0,1);
			}
			if(list.length == 2){ // Two Labels
				if(arr[0] != c(list[0])*c(list[1])){
					return(false);
				}
			}else{ // One Label
				var nC:Number = arr[0]/c(list[0]);
				if(!(nC is int)){
					return(false);
				}
				if(nC == 25 || nC == 49 || nC == 121){
					return(false);
				}
			}
			if(tileActual[i].preL != 1 || tileActual[i].preM != 1 || tileActual[i].preR != 1){
				return(false);
			}
			// Check labels work
			return(true);
		}
		private function checkMixWork(arr:Array,i:int):Boolean{
			if(arr[0]*arr[2]>850){
				return(false);
			}
			if(arr[0] == arr[2]){
				return(false);
			}
			if((arr[1] == "L" && arr[3] == "M") || (arr[1] == "M" && arr[3] == "L")){
				if(tileActual[i].colR!=s(arr[0]*arr[2]) && tileActual[i].colR != "ALL"){
					return(false);
				}
			}
			if((arr[1] == "R" && arr[3] == "M") || (arr[1] == "M" && arr[3] == "R")){
				if(tileActual[i].colL!=s(arr[0]*arr[2]) && tileActual[i].colL != "ALL"){
					return(false);
				}
			}
			if((arr[1] == "L" && arr[3] == "R") || (arr[1] == "R" && arr[3] == "L")){
				if(tileActual[i].colM!=s(arr[0]*arr[2]) && tileActual[i].colM != "ALL"){
					return(false);
				}
			}
			if(tileActual[i].preL != 1 || tileActual[i].preM != 1 || tileActual[i].preR != 1){
				return(false);
			}
			return(true);
		}
		private function checkPresWork(arr:Array,i:int):Boolean{
			// arr: COLOR1 - DIR1 - PRES1 - COLOR2 - DIR2 - PRES2
			if(arr[0] != arr[3]){ // colors don't match
				return(false);
			}
			var sum:int = int(arr[2])+int(arr[5]);
			if((arr[1]=="L" && arr[4]=="M") || (arr[1]=="M" && arr[4]=="L")){
				if(tileActual[i].preR != sum || (tileActual[i].colR != s(arr[0]) && tileActual[i].colR!="ALL")){
					return(false);
				}
			}else if((arr[1]=="L" && arr[4]=="R") || (arr[1]=="R" && arr[4]=="L")){
				if(tileActual[i].preM != sum || (tileActual[i].colM != s(arr[0]) && tileActual[i].colM!="ALL")){
					return(false);
				}
			}else if((arr[1]=="R" && arr[4]=="M") || (arr[1]=="M" && arr[4]=="R")){
				if(tileActual[i].preL != sum || (tileActual[i].colL != s(arr[0]) && tileActual[i].colL!="ALL")){
					return(false);
				}
			}
			return(true);
		}
		private function checkDeprepWork(arr:Array,i:int):Boolean{
			// arr: COLOR1 - DIR1 - PRES1
			if(arr[2]==1){
				return(false);
			}
			if(arr[1] == "L"){
				if(int(tileActual[i].preM)+int(tileActual[i].preR) != int(tileActual[i].preL)){
					return(false);
				}
				if((tileActual[i].colM != "ALL" && tileActual[i].colM != s(arr[0])) || (tileActual[i].colR != "ALL" && tileActual[i].colR != s(arr[0]))){
					return(false)
				}
			}else if(arr[1] == "M"){
				if(int(tileActual[i].preL)+int(tileActual[i].preR) != int(tileActual[i].preM)){
					return(false);
				}
				if((tileActual[i].colL != "ALL" && tileActual[i].colL != s(arr[0])) || (tileActual[i].colR != "ALL" && tileActual[i].colR != s(arr[0]))){
					return(false)
				}
			}else if(arr[1] == "R"){
				if(int(tileActual[i].preM)+int(tileActual[i].preL) != int(tileActual[i].preR)){
					return(false);
				}
				if((tileActual[i].colM != "ALL" && tileActual[i].colM != s(arr[0])) || (tileActual[i].colL != "ALL" && tileActual[i].colL != s(arr[0]))){
					return(false)
				}
			}
			return(true);
		}
		
		private function c(col:String):int{ // c() converts STRING to PRIMECOL
			switch(col){
				case "R":
					return(5);
				case "B":
					return(7);
				case "Y":
					return(11);
				case "P":
					return(35);
				case "O":
					return(55);
				case "G":
					return(77);
				case "Br":
					return(385);
				case "Mg":
					return(175);
				case "Vi":
					return(245);
				case "Am":
					return(275);
				case "Gd":
					return(605);
				case "Cy":
					return(539);
				case "Lm":
					return(847);
			}
			return(1000);
		}
		private function s(col:int):String{ // s() converts PRIMECOL to STRING
			switch(col){
				case 5:
					return("R");
				case 7:
					return("B");
				case 11:
					return("Y");
				case 35:
					return("P");
				case 55:
					return("O");
				case 77:
					return("G");
				case 385:
					return("Br");
				case 175:
					return("Mg");
				case 245:
					return("Vi");
				case 275:
					return("Am");
				case 605:
					return("Gd");
				case 539:
					return("Cy");
				case 847:
					return("Lm");
			}
			return("ERROR");
		}
		private function sL(col:String):Array{ // sL() converts STRING to NAME/COMPOSITION   ---   sL(s())[0/1] is PRIMECOL to NAME/COMPOSITION
			switch(col){
				case "R":
					return(["Red","(Primary)"]);
				case "B":
					return(["Blue","(Primary)"]);
				case "Y":
					return(["Yellow","(Primary)"]);
				case "P":
					return(["Purple","(Red + Blue)"]);
				case "O":
					return(["Orange","(Yellow + Red)"]);
				case "G":
					return(["Green","(Blue + Yellow)"]);
				case "Br":
					return(["Brown","(Red + Blue + Yellow)"]);
				case "Mg":
					return(["Magenta","(Red + Purple)"]);
				case "Vi":
					return(["Violet","(Blue + Purple)"]);
				case "Am":
					return(["Amber","(Red + Orange)"]);
				case "Gd":
					return(["Gold","(Yellow + Orange)"]);
				case "Cy":
					return(["Cyan","(Blue + Green)"]);
				case "Lm":
					return(["Lime","(Yellow + Green)"]);
			}
			return(["ERORR","ERROR"]);
		}
		
		private function connectDir(cir:String, p:Object = null):Boolean{
			if(p == null){
				return(false);
			}else{
				var tile:int = p.tile;
				var rot:String = p.rot;
				if(tile == 1){
					if(rot == "H"){
						if(cir == "E" || cir == "W"){
							return(true);
						}
					}else if(rot == "V"){
						if(cir == "N" || cir == "S"){
							return(true);
						}
					}
				}else if(tile == 2){
					if(rot == "NE"){
						if(cir == "N" || cir == "E"){
							return(true);
						}
					}else if(rot == "NW"){
						if(cir == "N" || cir == "W"){
							return(true);
						}
					}else if(rot == "SE"){
						if(cir == "S" || cir == "E"){
							return(true);
						}
					}else if(rot == "SW"){
						if(cir == "S" || cir == "W"){
							return(true);
						}
					}
				}else if(tile == 3){
					return(true);
				}else{
					if(rot == "xN"){
						if(cir != "N"){
							return(true);
						}
					}else if(rot == "xS"){
						if(cir != "S"){
							return(true);
						}
					}else if(rot == "xE"){
						if(cir != "E"){
							return(true);
						}
					}else if(rot == "xW"){
						if(cir != "W"){
							return(true);
						}
					}
				}
			}
			return(false);
		}
		private function connectTileCon(pos:int):Boolean{
			for(var i:int = 0;i<tileCon.length;i++){
				if(tileCon[i].circPos == pos){
					return(true);
				}
			}
			for(i=0;i<actions.length;i++){
				if(actions[i].circPos == pos){
					return(true);
				}
			}
			return(false);
		}
		private function tileConnect():Boolean{

			var w:Number = data.pack.itm.(@id==pointer).@size;
			
			for(var i:Number = 0;i<tileActual.length;i++){
				if(i>=w){
					//check up
					if(connectDir("N",tileActual[i]) != connectDir("S",tileActual[i-w])){
						return(false);
					}
				}
				if(!((i+1)/w is int)){
					//check right
					if(connectDir("E",tileActual[i]) != connectDir("W",tileActual[i+1])){
						return(false);
					}
				}
				if(i < w*w-w){
					//check down
					if(connectDir("S",tileActual[i]) != connectDir("N",tileActual[i+w])){
						return(false);
					}
				}
				if(!(i/w is int)){
					//check left
					if(connectDir("W",tileActual[i]) != connectDir("E",tileActual[i-1])){
						return(false);
					}
				}
			}
			return(true);
		}
		private function inputConnect():Boolean{
			var w:Number = data.pack.itm.(@id==pointer).@size;
			for(var i:int = 0;i<4*w;i++){
				if(i<w){
					if(connectDir("N",tileActual[i]) != connectTileCon(i)){
						return(false);
					}
				}else if(i<2*w){
					if(connectDir("E",tileActual[w*i - w*w + w - 1]) != connectTileCon(i)){
						return(false);
					}
				}else if(i<3*w){
					if(connectDir("S",tileActual[-i + w*w + 2*w - 1]) != connectTileCon(i)){
						return(false);
					}
				}else if(i<4*w){
					if(connectDir("W",tileActual[-w*i + 4*w*w - w]) != connectTileCon(i)){
						return(false);
					}
				}
			}
			return(true);
		}
		
		private function runSim(e:MouseEvent):void{
			
			// Tile Connect Check
			
			if(tileConnect() == false || inputConnect() == false){
				newTextError();
			}else{
				simT = -6; // minus amount for input tile animations
				stopUI();
				stage.addEventListener(Event.ENTER_FRAME, uiRenderNicer);
				ui.crossOverlay.alpha = 0;
				tileFull = new Array(w*w);
				for(var i:int = 0;i<tileFull.length;i++){
					tileFull[i] = 0;
					if(tileActual[i]!=null){
						if(tileActual[i].tile>=4){
							var arr:Array = new Array();
							tileFull[i] = arr;
						}
					}
				}
				for(i = 0;i<inoutSyms.length;i++){
					if(inoutSyms[i].currentFrame == 1){
						inoutSyms[i].f.play();
						inoutSyms[i].f.visible = true;
						inoutSyms[i].f.col.gotoAndStop(inoutSyms[i].anim.currentFrameLabel);
					}
				}
				vic = false;
				errors = new Array();
				eList = new Array();
				stage.addEventListener(Event.ENTER_FRAME, renderSim);
			}
		}
		
		private function renderSim(e:Event):void{
			
			/*
			
			TILE_ACTUAL ARRAY:
			 - indexed via GRID CYCLIC cordinates
			
			 - .tile: tile number
			 - .rot: tile rotation string
			
			ACTIONS ARRAY:
			 - indexed randomly
			
			 - .pos: current position in GC cordinates
			 - .dir: direction of motion in CARDINAL
			
			*/
			
			if(simT == 0){
				// Add Check:Full into the normal tileFull system and call Error and end render
				saves = new Array();
				if(filterList.length!=0){
					for(var i:int = 0;i<actions.length;i++){
						for(var j:int = 0;j<filterList.length;j++){
							// Check filtering
							if(actions[i].dir == "N"){
								if(filterList[j].p1 == actions[i].pos && filterList[j].p2 == actions[i].pos+w){
									actions[i].col = c(filterList[j].col);
								}
							}else if(actions[i].dir == "S"){
								if(filterList[j].p1 == actions[i].pos-w && filterList[j].p2 == actions[i].pos){
									actions[i].col = c(filterList[j].col);
								}
							}else if(actions[i].dir == "E"){
								if(filterList[j].p1 == actions[i].pos-1 && filterList[j].p2 == actions[i].pos){
									actions[i].col = c(filterList[j].col);
								}
							}else if(actions[i].dir == "W"){
								if(filterList[j].p1 == actions[i].pos && filterList[j].p2 == actions[i].pos+1){
									actions[i].col = c(filterList[j].col);
								}
							}
						}
					}
				}
				
				// Check: Pass
				var ac2:Array = new Array();
				for(i = 0;i<actions.length;i++){
					var obj2:Object = new Object();
					if(tileActual[actions[i].pos].tile == 1){ // Straight Pipe
						if(tileActual[actions[i].pos].rot == "H" && actions[i].dir == "E"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LU.play(); // && tileActual[actions[i].pos].pre == actions[i].pre
								tiles[actions[i].pos].pipe.flow_LU.visible = true;
								tiles[actions[i].pos].pipe.flow_LU.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"E")){
									obj2.pos = int(actions[i].pos)+1;
									obj2.dir = "E";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"E",actions[i].col,actions[i].pre) == false){
										saves.push(new Array(actions[i].pos,"E",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"E",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "H" && actions[i].dir == "W"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RD.play();
								tiles[actions[i].pos].pipe.flow_RD.visible = true;
								tiles[actions[i].pos].pipe.flow_RD.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"W")){
									obj2.pos = int(actions[i].pos)-1;
									obj2.dir = "W";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"W",actions[i].col,actions[i].pre) == false){
										saves.push(new Array(actions[i].pos,"W",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"W",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "V" && actions[i].dir == "N"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RD.play();
								tiles[actions[i].pos].pipe.flow_RD.visible = true;
								tiles[actions[i].pos].pipe.flow_RD.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"N")){
									obj2.pos = int(actions[i].pos)-w;
									obj2.dir = "N";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"N",actions[i].col,actions[i].pre) == false){
										saves.push(new Array(actions[i].pos,"N",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"N",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "V" && actions[i].dir == "S"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LU.play();
								tiles[actions[i].pos].pipe.flow_LU.visible = true;
								tiles[actions[i].pos].pipe.flow_LU.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"S")){
									obj2.pos = int(actions[i].pos)+w;
									obj2.dir = "S";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"S",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"S",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"S",actions[i].col);
							}
						}
					}
					else if(tileActual[actions[i].pos].tile == 2){ // Curved Pipe
						if(tileActual[actions[i].pos].rot == "NE" && actions[i].dir == "S"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LR.anim();
								tiles[actions[i].pos].pipe.flow_LR.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LR.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"E")){
									obj2.pos = int(actions[i].pos)+1;
									obj2.dir = "E";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"E",actions[i].col,actions[i].pre) == false){
										saves.push(new Array(actions[i].pos,"E",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"S",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "NE" && actions[i].dir == "W"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RL.anim();
								tiles[actions[i].pos].pipe.flow_RL.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RL.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"N")){
									obj2.pos = int(actions[i].pos)-w;
									obj2.dir = "N";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"N",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"N",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"W",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "SE" && actions[i].dir == "W"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LR.anim();
								tiles[actions[i].pos].pipe.flow_LR.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LR.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"S")){
									obj2.pos = int(actions[i].pos)+w;
									obj2.dir = "S";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"S",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"S",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"W",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "SE" && actions[i].dir == "N"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RL.anim();
								tiles[actions[i].pos].pipe.flow_RL.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RL.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"E")){
									obj2.pos = int(actions[i].pos)+1;
									obj2.dir = "E";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"E",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"E",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"N",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "SW" && actions[i].dir == "N"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LR.anim();
								tiles[actions[i].pos].pipe.flow_LR.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LR.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"W")){
									obj2.pos = int(actions[i].pos)-1;
									obj2.dir = "W";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"W",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"W",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"N",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "SW" && actions[i].dir == "E"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RL.anim();
								tiles[actions[i].pos].pipe.flow_RL.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RL.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"S")){
									obj2.pos = int(actions[i].pos)+w;
									obj2.dir = "S";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"S",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"S",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"E",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "NW" && actions[i].dir == "E"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_LR.anim();
								tiles[actions[i].pos].pipe.flow_LR.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LR.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"N")){
									obj2.pos = int(actions[i].pos)-w;
									obj2.dir = "N";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"N",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"N",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"E",actions[i].col);
							}
						}else if(tileActual[actions[i].pos].rot == "NW" && actions[i].dir == "S"){
							if(tileFull[actions[i].pos] != 1 && (tileActual[actions[i].pos].col == "ALL" || tileActual[actions[i].pos].col == s(actions[i].col)) && tileActual[actions[i].pos].pre == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_RL.anim();
								tiles[actions[i].pos].pipe.flow_RL.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RL.f2.col.gotoAndStop(s(actions[i].col));
								tileFull[actions[i].pos] = 1;
								if(realTilePos(actions[i].pos,"W")){
									obj2.pos = int(actions[i].pos)-1;
									obj2.dir = "W";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"W",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"W",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"S",actions[i].col);
							}
						}
					}
					else if(tileActual[actions[i].pos].tile == 3){ // Crossover pipe
						if(actions[i].dir == "N"){
							if(tileFull[actions[i].pos] != 1 && tileFull[actions[i].pos] != "V" && (tileActual[actions[i].pos].colV == "ALL" || tileActual[actions[i].pos].colV == s(actions[i].col)) && tileActual[actions[i].pos].preV == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_D.anim();
								tiles[actions[i].pos].pipe.flow_D.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_D.f2.col.gotoAndStop(s(actions[i].col));
								if(tileFull[actions[i].pos] == "H"){
									tileFull[actions[i].pos] = 1;
								}else{
									tileFull[actions[i].pos] = "V";
								}
								if(realTilePos(actions[i].pos,"N")){
									obj2.pos = int(actions[i].pos)-w;
									obj2.dir = "N";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"N",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"N",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"N",actions[i].col);
							}
						}else if(actions[i].dir == "S"){
							if(tileFull[actions[i].pos] != 1 && tileFull[actions[i].pos] != "V" && (tileActual[actions[i].pos].colV == "ALL" || tileActual[actions[i].pos].colV == s(actions[i].col)) && tileActual[actions[i].pos].preV == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_U.anim();
								tiles[actions[i].pos].pipe.flow_U.f1.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_U.f2.col.gotoAndStop(s(actions[i].col));
								if(tileFull[actions[i].pos] == "H"){
									tileFull[actions[i].pos] = 1;
								}else{
									tileFull[actions[i].pos] = "V";
								}
								if(realTilePos(actions[i].pos,"S")){
									obj2.pos = int(actions[i].pos)+w;
									obj2.dir = "S";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"S",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"S",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"S",actions[i].col);
							}
						}else if(actions[i].dir == "E"){
							if(tileFull[actions[i].pos] != 1 && tileFull[actions[i].pos] != "H" && (tileActual[actions[i].pos].colH == "ALL" || tileActual[actions[i].pos].colH == s(actions[i].col)) && tileActual[actions[i].pos].preH == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_L.play();
								tiles[actions[i].pos].pipe.flow_L.visible = true;
								tiles[actions[i].pos].pipe.flow_L.col.gotoAndStop(s(actions[i].col));
								if(tileFull[actions[i].pos] == "V"){
									tileFull[actions[i].pos] = 1;
								}else{
									tileFull[actions[i].pos] = "H";
								}
								if(realTilePos(actions[i].pos,"E")){
									obj2.pos = int(actions[i].pos)+1;
									obj2.dir = "E";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"E",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"E",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"E",actions[i].col);
							}
						}else if(actions[i].dir == "W"){
							if(tileFull[actions[i].pos] != 1 && tileFull[actions[i].pos] != "H" && (tileActual[actions[i].pos].colH == "ALL" || tileActual[actions[i].pos].colH == s(actions[i].col)) && tileActual[actions[i].pos].preH == actions[i].pre){
								tiles[actions[i].pos].pipe.flow_R.play();
								tiles[actions[i].pos].pipe.flow_R.visible = true;
								tiles[actions[i].pos].pipe.flow_R.col.gotoAndStop(s(actions[i].col));
								if(tileFull[actions[i].pos] == "V"){
									tileFull[actions[i].pos] = 1;
								}else{
									tileFull[actions[i].pos] = "H";
								}
								if(realTilePos(actions[i].pos,"W")){
									obj2.pos = int(actions[i].pos)-1;
									obj2.dir = "W";
									obj2.col = actions[i].col;
									obj2.pre = actions[i].pre;
									ac2.push(obj2);
								}else{
									if(pushTileCon(actions[i].pos,"W",actions[i].col,actions[i].pre)==false){
										saves.push(new Array(actions[i].pos,"W",actions[i].col));
									}
								}
							}else{
								newPipeError(actions[i].pos,"W",actions[i].col);
							}
						}
					}
					else if(tileActual[actions[i].pos].tile == 4 || tileActual[actions[i].pos].tile == 5){ // Mixer / Seperator
						if((tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "E") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "N") || (tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "S")){
							// All Left Inputs
							if((tileActual[actions[i].pos].colL == "ALL" || tileActual[actions[i].pos].colL == s(actions[i].col)) && actions[i].pre == 1 && tileActual[actions[i].pos].preL == 1 && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_LIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LIN.play();
								tiles[actions[i].pos].pipe.flow_LIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"L");
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}else if((tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "E") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "S") || (tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "N")){
							// All Mid Inputs
							if((tileActual[actions[i].pos].colM == "ALL" || tileActual[actions[i].pos].colM == s(actions[i].col)) && actions[i].pre == 1 && tileActual[actions[i].pos].preM == 1 && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_MIN.play();
								tiles[actions[i].pos].pipe.flow_MIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_MIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"M");
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}else if((tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "N") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "S") || (tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "E")){
							// All Right Inputs
							if((tileActual[actions[i].pos].colR == "ALL" || tileActual[actions[i].pos].colR == s(actions[i].col)) && actions[i].pre == 1 && tileActual[actions[i].pos].preR == 1 && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_RIN.play();
								tiles[actions[i].pos].pipe.flow_RIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"R");
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}
					}
					else if(tileActual[actions[i].pos].tile == 6 || tileActual[actions[i].pos].tile == 7){ // Pressurizer / Depressurizer
						if((tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "E") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "N") || (tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "S")){
							// All Left Inputs
							if((tileActual[actions[i].pos].colL == "ALL" || tileActual[actions[i].pos].colL == s(actions[i].col)) && actions[i].pre == tileActual[actions[i].pos].preL && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_LIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_LIN.play();
								tiles[actions[i].pos].pipe.flow_LIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"L",actions[i].pre);
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}else if((tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "E") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "S") || (tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "N")){
							// All Mid Inputs
							if((tileActual[actions[i].pos].colM == "ALL" || tileActual[actions[i].pos].colM == s(actions[i].col)) && actions[i].pre == tileActual[actions[i].pos].preM && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_MIN.play();
								tiles[actions[i].pos].pipe.flow_MIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_MIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"M",actions[i].pre);
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}else if((tileActual[actions[i].pos].rot == "xW" && actions[i].dir == "N") || (tileActual[actions[i].pos].rot == "xS" && actions[i].dir == "W") || (tileActual[actions[i].pos].rot == "xE" && actions[i].dir == "S") || (tileActual[actions[i].pos].rot == "xN" && actions[i].dir == "E")){
							// All Right Inputs
							if((tileActual[actions[i].pos].colR == "ALL" || tileActual[actions[i].pos].colR == s(actions[i].col)) && actions[i].pre == tileActual[actions[i].pos].preR && tileFull[actions[i].pos]!=1){
								tiles[actions[i].pos].pipe.flow_RIN.play();
								tiles[actions[i].pos].pipe.flow_RIN.col.gotoAndStop(s(actions[i].col));
								tiles[actions[i].pos].pipe.flow_RIN.visible = true;
								tileFull[actions[i].pos].push(actions[i].col,"R",actions[i].pre);
							}else{
								newPipeError(actions[i].pos,actions[i].dir,actions[i].col);
							}
						
						}
					}
				}
				actions = new Array();
				actions = ac2.slice();
				
			}else if(simT == 14){
				// Check Mix
				
				for(i = 0;i<tileActual.length;i++){
					if(tileActual[i]!=null){
						if(tileActual[i].tile == 4){ // Mixer
							if(tileFull[i]!=1){
								if(tileFull[i].length == 4){
									if(checkMixWork(tileFull[i],i) == true){
										obj2 = new Object();
										obj2 = newMixColAction(tileFull[i],tileActual[i].rot,i);
										if(realTilePos(i,obj2.dir)){
											actions.push(obj2);
										}else{
											if(pushTileCon(i,obj2.dir,obj2.col,obj2.pre,true)==false){
												saves.push(new Array(i,obj2.dir,obj2.col));
											}
										}
										if((obj2.dir=="N" && tileActual[i].rot=="xW") || (obj2.dir=="E" && tileActual[i].rot=="xN") || (obj2.dir=="S" && tileActual[i].rot=="xE") || (obj2.dir=="W" && tileActual[i].rot=="xS")){
											// Play Left
											tiles[i].pipe.flow_LOUT.visible = true;
											tiles[i].pipe.flow_LOUT.play();
											tiles[i].pipe.flow_LOUT.col.gotoAndStop(s(obj2.col));
										}else if((obj2.dir=="N" && tileActual[i].rot=="xS") || (obj2.dir=="E" && tileActual[i].rot=="xW") || (obj2.dir=="S" && tileActual[i].rot=="xN") || (obj2.dir=="W" && tileActual[i].rot=="xE")){
											// Play Mid
											tiles[i].pipe.flow_MOUT.visible = true;
											tiles[i].pipe.flow_MOUT.play();
											tiles[i].pipe.flow_MOUT.col.gotoAndStop(s(obj2.col));
										}else if((obj2.dir=="N" && tileActual[i].rot=="xE") || (obj2.dir=="E" && tileActual[i].rot=="xS") || (obj2.dir=="S" && tileActual[i].rot=="xW") || (obj2.dir=="W" && tileActual[i].rot=="xN")){
											// Play Right
											tiles[i].pipe.flow_ROUT.visible = true;
											tiles[i].pipe.flow_ROUT.play();
											tiles[i].pipe.flow_ROUT.col.gotoAndStop(s(obj2.col));
										}
										tileFull[i] = 1;
									}else{
										// RETURN MIXING ERROR HERE
										newTileError(i,tileFull[i][0],tileFull[i][2]);
										
									}
								}else if(tileFull[i].length>=4){
									newTileError(i,tileFull[i][0],tileFull[i][2],tileFull[i][4]);
								}
							}
						}
						else if(tileActual[i].tile == 5){ // Seperator
							if(tileFull[i]!=1){
								if(tileFull[i].length == 2){
									if(checkSepWork(tileFull[i],i) == true){
										var list1:Array = newSepColActions(tileFull[i],tileActual[i].rot,i);
										obj2 = new Object();
										if(realTilePos(i,list1[1].dir)){
											obj2 = list1[1];
											actions.push(obj2);
										}else{
											if(pushTileCon(i,list1[1].dir,list1[1].col,1,true)==false){
												saves.push(new Array(i,list1[1].dir,list1[1].col));
											}
										}
										if(realTilePos(i,list1[3].dir)){
											obj2 = list1[3];
											actions.push(obj2);
										}else{
											if(pushTileCon(i,list1[3].dir,list1[3].col,1,true)==false){
												saves.push(new Array(i,list1[3].dir,list1[3].col));
											}
										}
										if(list1[0] == "L" || list1[2] == "L"){
											tiles[i].pipe.flow_LOUT.visible = true;
											tiles[i].pipe.flow_LOUT.play();
											if(list1[0] == "L"){
												tiles[i].pipe.flow_LOUT.col.gotoAndStop(s(list1[1].col));
											}else{
												tiles[i].pipe.flow_LOUT.col.gotoAndStop(s(list1[3].col));
											}
										}
										if(list1[0] == "M" || list1[2] == "M"){
											tiles[i].pipe.flow_MOUT.visible = true;
											tiles[i].pipe.flow_MOUT.play();
											if(list1[0] == "M"){
												tiles[i].pipe.flow_MOUT.col.gotoAndStop(s(list1[1].col));
											}else{
												tiles[i].pipe.flow_MOUT.col.gotoAndStop(s(list1[3].col));
											}
										}
										if(list1[0] == "R" || list1[2] == "R"){
											tiles[i].pipe.flow_ROUT.visible = true;
											tiles[i].pipe.flow_ROUT.play();
											if(list1[0] == "R"){
												tiles[i].pipe.flow_ROUT.col.gotoAndStop(s(list1[1].col));
											}else{
												tiles[i].pipe.flow_ROUT.col.gotoAndStop(s(list1[3].col));
											}
										}
										tileFull[i] = 1;
									}else{
										// CALL INCORRECT SEPERATION ERROR HERE
										newTileError(i,tileFull[i][0]);
									}
								}else if(tileFull[i].length>=2){
									newTileError(i,tileFull[i][0],tileFull[i][2]);
								}
							}
						}
						else if(tileActual[i].tile == 6){ // Pressurizer
							if(tileFull[i]!=1){
								if(tileFull[i].length == 6){
									if(checkPresWork(tileFull[i],i)==true){
										obj2 = new Object();
										obj2 = newPresAction(tileFull[i],tileActual[i].rot,i);
										if(realTilePos(i,obj2.dir)){
											actions.push(obj2);
										}else{
											if(pushTileCon(i,obj2.dir,obj2.col,obj2.pre,true)==false){
												saves.push(new Array(i,obj2.dir,obj2.col));
											}
										}
										if((obj2.dir=="N" && tileActual[i].rot=="xW") || (obj2.dir=="E" && tileActual[i].rot=="xN") || (obj2.dir=="S" && tileActual[i].rot=="xE") || (obj2.dir=="W" && tileActual[i].rot=="xS")){
											// Play Left
											tiles[i].pipe.flow_LOUT.visible = true;
											tiles[i].pipe.flow_LOUT.play();
											tiles[i].pipe.flow_LOUT.col.gotoAndStop(s(obj2.col));
										}else if((obj2.dir=="N" && tileActual[i].rot=="xS") || (obj2.dir=="E" && tileActual[i].rot=="xW") || (obj2.dir=="S" && tileActual[i].rot=="xN") || (obj2.dir=="W" && tileActual[i].rot=="xE")){
											// Play Mid
											tiles[i].pipe.flow_MOUT.visible = true;
											tiles[i].pipe.flow_MOUT.play();
											tiles[i].pipe.flow_MOUT.col.gotoAndStop(s(obj2.col));
										}else if((obj2.dir=="N" && tileActual[i].rot=="xE") || (obj2.dir=="E" && tileActual[i].rot=="xS") || (obj2.dir=="S" && tileActual[i].rot=="xW") || (obj2.dir=="W" && tileActual[i].rot=="xN")){
											// Play Right
											tiles[i].pipe.flow_ROUT.visible = true;
											tiles[i].pipe.flow_ROUT.play();
											tiles[i].pipe.flow_ROUT.col.gotoAndStop(s(obj2.col));
										}
										tileFull[i] = 1;
									}else{
										newTileError(i,tileFull[i][0],tileFull[i][3]);
									}
								}else if(tileFull[i].length>=6){
									newTileError(i, tileFull[i][0], tileFull[i][3], tileFull[i][6]);
								}
							}
						}
						else if(tileActual[i].tile == 7){ // Depressurizer
							if(tileFull[i]!=1){
								if(tileFull[i].length == 3){
									if(checkDeprepWork(tileFull[i],i) == true){
										var list2:Array = newDeprepActions(tileFull[i],tileActual[i].rot,i);
										obj2 = new Object();
										if(realTilePos(i,list2[1].dir)){
											obj2 = list2[1];
											actions.push(obj2);
										}else{
											if(pushTileCon(i,list2[1].dir,list2[1].col,list2[1].pre,true)==false){
												saves.push(new Array(i,list2[1].dir,list2[1].col));
											}
										}
										if(realTilePos(i,list2[3].dir)){
											obj2 = list2[3];
											actions.push(obj2);
										}else{
											if(pushTileCon(i,list2[3].dir,list2[3].col,list2[3].pre,true)==false){
												saves.push(new Array(i,list2[3].dir,list2[3].col));
											}
										}
										if(list2[0] == "L" || list2[2] == "L"){
											tiles[i].pipe.flow_LOUT.visible = true;
											tiles[i].pipe.flow_LOUT.play();
											tiles[i].pipe.flow_LOUT.col.gotoAndStop(s(list2[1].col));
										}
										if(list2[0] == "M" || list2[2] == "M"){
											tiles[i].pipe.flow_MOUT.visible = true;
											tiles[i].pipe.flow_MOUT.play();
											tiles[i].pipe.flow_MOUT.col.gotoAndStop(s(list2[1].col));
										}
										if(list2[0] == "R" || list2[2] == "R"){
											tiles[i].pipe.flow_ROUT.visible = true;
											tiles[i].pipe.flow_ROUT.play();
											tiles[i].pipe.flow_ROUT.col.gotoAndStop(s(list2[1].col));
										}
										tileFull[i] = 1;
									}else{
										newTileError(i,tileFull[i][0]);
									}
								}else if(tileFull[i].length>=9){
									newTileError(i,tileFull[i][0], tileFull[i][3], tileFull[i][6]);
								}else if(tileFull[i].length>3){
									newTileError(i,tileFull[i][0], tileFull[i][3]);
								}
							}
						}
					}
				}
				
				for(i=0;i<saves.length;i++){
					newPipeError(saves[i][0],saves[i][1],saves[i][2],true);
				}
				
				simT -=20;
				
				// Check End
				if(actions.length==0 || errors.length>=1){
					if(tileCon.length == 0){
						vic = true;
						if(pointer == 0 && puzzlePointer == 15){
							openAllFirstPacks();
						}
						saveData[pointer][puzzlePointer] = 2;
						if(puzzlePointer == 15){
							if(pointer != data.inf.@maxpack){
								if(saveData[pointer+1][0] == 0){
									saveData[pointer+1][0] = 1;
								}
							}
						}else{
							if(saveData[pointer][puzzlePointer+1] == 0){
								saveData[pointer][puzzlePointer+1] = 1;
							}
						}
						saveGame.data.sd = saveData;
						saveGame.flush();
					}else{
						vic = false;
					}
					stage.removeEventListener(Event.ENTER_FRAME, renderSim);
					animInterupt();
				}
			}
			simT++;
		}
		
		// Error Functions
		
		private function newTileError(i:int, c1:int, c2:int = -1, c3:int = -1):void{
			if(errors.length == 0){
				stage.addEventListener(Event.ENTER_FRAME, errorRender);
			}
			var error:Object = new Object();
			error.typ = "Tile Error";
			error.idx = i;
			error.col1 = c1;
			error.col2 = c2;
			error.col3 = c3;
			error.count = 0;
			errors.push(error);
			if(splash == ""){
				splash = "An Error Occured:\nA machine is overflowing!";
			}
		}
		private function newPipeError(i:int, side:String, col:int,special:Boolean = false):void{
			if(errors.length == 0){
				stage.addEventListener(Event.ENTER_FRAME, errorRender);
			}
			var error:Object = new Object();
			error.typ = "Pipe Error";
			error.idx = i;
			error.col1 = col;
			error.count = 0;
			error.side = side;
			error.spec = special;
			errors.push(error);
			if(splash == ""){
				splash = "An Error Occured:\nColor is overflowing somewhere!";
			}
		}
		private function newTextError():void{
			tError = 0;
			addChild(errorTxt);
			errorTxt.txt.text = "An Error Occured:\nThere is a missing pipe connection somewhere.";
			errorTxt.alpha = 0;
			errorTxt.gotoAndStop(2);
			stage.addEventListener(Event.ENTER_FRAME, textErrorRender);
		}
		private function textErrorRender(e:Event):void{
			if(tError < 10){
				errorTxt.alpha +=0.1;
			}else if(tError >= 60 && tError < 80){
				errorTxt.alpha-=0.05;
			}else if(tError == 80){
				stage.removeEventListener(Event.ENTER_FRAME, textErrorRender);
				tError = 0;
				removeChild(errorTxt);
			}
			tError++;
		}
		private function errorRender(e:Event):void{
			for(var i:int = 0;i<eList.length;i++){
				eList[i].emove();
				if(errors.length == 0){
					eList[i].alpha-=0.05;
				}
				if(eList[i].alpha<=0){
					removeChild(eList[i]);
					eList.splice(i,1);
					i--;
				}
			}
			for(i=0;i<errors.length;i++){
				if(errors[i].count == 2){
					errors[i].count = 0;
					var nE:ErrorObject = new ErrorObject();
					if(errors[i].typ == "Tile Error"){
						nE.x = (errors[i].idx%w)*tW+35+tW/2;
						nE.y = Math.floor(errors[i].idx/w)*tW+35+tW/2;
						nE.xsp = Math.random()*3-1.5;
						nE.ysp = Math.random()*3-1.5;
						if(errors[i].col2 == -1){
							nE.gotoAndStop(s(errors[i].col1));
						}else if(errors[i].col3 == -1){
							if(Math.random()<0.5){
								nE.gotoAndStop(s(errors[i].col1));
							}else{
								nE.gotoAndStop(s(errors[i].col2));
							}
						}else{
							if(Math.random()<0.3){
								nE.gotoAndStop(s(errors[i].col1));
							}else if(Math.random()<0.5){
								nE.gotoAndStop(s(errors[i].col2));
							}else{
								nE.gotoAndStop(s(errors[i].col3));
							}
						}
					}else if(errors[i].typ == "Pipe Error"){
						if(errors[i].side == "N"){
							nE.x = (errors[i].idx%w)*tW+35+tW/2+Math.random()*20-10;
							nE.y = Math.floor(errors[i].idx/w)*tW+35+tW;
							nE.xsp = Math.random()*1-0.5;
							nE.ysp = -Math.random()*1.5-0.5;
							if(errors[i].spec == true){
								nE.y -=tW;
							}
						}else if(errors[i].side == "S"){
							nE.x = (errors[i].idx%w)*tW+35+tW/2+Math.random()*20-10;
							nE.y = Math.floor(errors[i].idx/w)*tW+35;
							nE.xsp = Math.random()*1-0.5;
							nE.ysp = Math.random()*1.5+0.5;
							if(errors[i].spec == true){
								nE.y +=tW;
							}
						}else if(errors[i].side == "E"){
							nE.x = (errors[i].idx%w)*tW+35;
							nE.y = Math.floor(errors[i].idx/w)*tW+35+tW/2+Math.random()*20-10;
							nE.xsp = Math.random()*1.5+0.5;
							nE.ysp = Math.random()*1-0.5;
							if(errors[i].spec == true){
								nE.x +=tW;
							}
						}else if(errors[i].side == "W"){
							nE.x = (errors[i].idx%w)*tW+35+tW;
							nE.y = Math.floor(errors[i].idx/w)*tW+35+tW/2+Math.random()*20-10;
							nE.xsp = -Math.random()*1.5-0.5;
							nE.ysp = Math.random()*1-0.5;
							if(errors[i].spec == true){
								nE.x -=tW;
							}
						}
						nE.gotoAndStop(s(errors[i].col1));
					}
					addChild(nE);
					eList.push(nE);
				}else{
					errors[i].count++;
				}
			}
			if(iScreen.stage){
				setChildIndex(iScreen,numChildren-1);
			}
			if(fScreen.stage){
				setChildIndex(fScreen,numChildren-1);
			}
			if(eList.length == 0 && errors.length == 0){
				stage.removeEventListener(Event.ENTER_FRAME, errorRender);
			}
		}
		
		// Consistient Render Nicer
		
		private function uiRenderNicer(e:Event):void{
			// put things here that make the ui look nicer and not cut off other things
			ui.setChildIndex(ui.crossOverlay, ui.numChildren-1);
			if(filterList.length!=0){
				for(var i:int = 0;i<filterObjects.length;i++){
					ui.setChildIndex(filterObjects[i],ui.numChildren-1);
				}
			}
			ui.setChildIndex(ui.dLs1, ui.numChildren-1);
			ui.setChildIndex(ui.dLs2, ui.numChildren-1);
		}
		
		// After Game Functions
		
		private function runInteruptScreen():void{
			if(iScreen.currentFrame != 3){
				iScreen.nextBtn.addEventListener(MouseEvent.CLICK, goToNextPuzzle);
			}
			iScreen.menuBtn.addEventListener(MouseEvent.CLICK, animInteruptToPuzzle);
		}
		private function stopInteruptScreen():void{
			if(iScreen.currentFrame != 3){
				iScreen.nextBtn.removeEventListener(MouseEvent.CLICK, goToNextPuzzle);
			}
			iScreen.menuBtn.removeEventListener(MouseEvent.CLICK, animInteruptToPuzzle);
		}
		private function goToNextPuzzle(e:MouseEvent):void{
			errors = new Array();
			if(vic == true){ // Go to the next puzzle
				if(puzzlePointer == 15){ // ADD MAX PACK LIMIT
					pointer++;
					puzzlePointer = 0;
				}else{
					puzzlePointer++;
				}
			}
			animResetPuzzle();
		}
		
		private function prepSavedUI():void{ // reload saved UI data
			for(var i:int = 0;i<tileActual.length;i++){
				if(tileActual[i]!=null){
					var acc:MovieClip = tiles[i].pipe as MovieClip;
					acc.gotoAndStop(tileActual[i].tile+1);
					if(tileActual[i].tile == 1){
						acc.lab.setCol(tileActual[i].col);
						acc.pre.setAcPre(tileActual[i].pre);
						if(tileActual[i].rot == "H"){
							acc.rotation = 0;
							acc.lab.rotation = 0;
							acc.lab.labH.visible = true;
							acc.lab.labV.visible = false;
						}else if(tileActual[i].rot == "V"){
							acc.rotation = 90;
							acc.lab.rotation = -90;
							acc.lab.labH.visible = false;
							acc.lab.labV.visible = true;
						}
					}else if(tileActual[i].tile == 2){
						acc.lab.labNE.visible = false;
						acc.lab.labNW.visible = false;
						acc.lab.labSE.visible = false;
						acc.lab.labSW.visible = false;
						acc.lab.setCol(tileActual[i].col);
						acc.pre.setAcPre(tileActual[i].pre);
						if(tileActual[i].rot == "NE"){
							acc.lab.labNE.visible = true;
							acc.rotation = 0;
							acc.lab.rotation = 0;
						}else if(tileActual[i].rot == "SE"){
							acc.lab.labSE.visible = true;
							acc.rotation = 90;
							acc.lab.rotation = -90;
						}else if(tileActual[i].rot == "NW"){
							acc.lab.labNW.visible = true;
							acc.rotation = 270;
							acc.lab.rotation = -270;
						}else if(tileActual[i].rot == "SW"){
							acc.lab.labSW.visible = true;
							acc.rotation = 180;
							acc.lab.rotation = -180;
						}
					}else if(tileActual[i].tile == 3){
						acc.lab.setVCol(tileActual[i].colV);
						acc.lab.setHCol(tileActual[i].colH);
						acc.pre.setAcHPre(tileActual[i].preH);
						acc.pre.setAcVPre(tileActual[i].preV);
					}else if(tileActual[i].tile >= 4){
						acc.lab.labN.visible = true;
						acc.lab.labE.visible = true;
						acc.lab.labS.visible = true;
						acc.lab.labW.visible = true;
						if(tileActual[i].rot == "xN"){
							acc.rotation = 90;
							acc.lab.rotation = -90;
							acc.lab.labN.visible = false;
							acc.sym.rotation = -90;
						}else if(tileActual[i].rot == "xE"){
							acc.rotation = 180;
							acc.lab.rotation = -180;
							acc.lab.labE.visible = false;
							acc.sym.rotation = -180;
						}else if(tileActual[i].rot == "xS"){
							acc.rotation = 270;
							acc.lab.rotation = -270;
							acc.lab.labS.visible = false;
							acc.sym.rotation = -270;
						}else if(tileActual[i].rot == "xW"){
							acc.rotation = 0;
							acc.lab.rotation = 0;
							acc.sym.rotation = 0;
							acc.lab.labW.visible = false;
						}
						acc.lab.setLCol(tileActual[i].colL);
						acc.lab.setRCol(tileActual[i].colR);
						acc.lab.setMCol(tileActual[i].colM);
						acc.pre.setAcLPre(tileActual[i].preL);
						acc.pre.setAcMPre(tileActual[i].preM);
						acc.pre.setAcRPre(tileActual[i].preR);
					}
				}
			}
		}
		
		// Transition Animations
		private function animCyclePacks(p:int):void{
			stopMainMenu();
			anim = "cycle-packs";
			animT = 0;
			posList = new Array(data.pack.itm.length());
			for(var i:int = 0;i<data.pack.itm.length();i++){
				posList[i] = mScreen.getChildAt(i).x+p*400;
			}
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animMenuToPuzzle(e:Event):void{
			stopMainMenu();
			animT = 0;
			anim = "menu-puzzle";
			posList = new Array(16);
			icList = new Array();
			puzzlePointer = 0;
			for(var i:int = 0;i<16;i++){
				var ic:PuzzleIcon = new PuzzleIcon();
				if(saveData[pointer][i] == 1){
					ic.gotoAndStop(2);
				}else if(saveData[pointer][i] == 2){
					ic.gotoAndStop(3);
				}
				ic.x = (i%4)*70+60+(Math.floor((i%4)/2)*2-1)*200;
				ic.y = (Math.floor(i/4))*70+100;
				ic.numTxt.text = ""+(i+1);
				addChild(ic);
				icList.push(ic);
				//var goalObj:Object = new Object();
				//goalObj.px = (i%4)*70+60;
				//goalObj.py = (Math.floor(i/4))*70+100;
				posList[i] = (i%4)*70+60;
			}
			for(var j:int = data.pack.itm.length()-1;j>=0;j--){
				//mScreen.getChildAt(j).removeEventListener(MouseEvent.CLICK, animMenuToPuzzle);
				if(j!=pointer){
					mScreen.removeChildAt(j);
				}
			}
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animPuzzleToMenu(e:MouseEvent):void{
			posList = new Array(16);
			for(var i:int = 0;i<16;i++){
				posList[i] = (i%4)*70+60+(Math.floor((i%4)/2)*2-1)*200
			}
			stopPuzzleMenu();
			animT = 0;
			anim = "puzzle-menu";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animPuzzleToInterface():void{
			stopPuzzleMenu();
			addChild(fScreen);
			fScreen.alpha = 0;
			animT = 0;
			anim = "puzzle-interface";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animInterfaceToUIMenu(e:MouseEvent):void{
			stopUI();
			addChild(uiMenu);
			uiMenu.showTxt.text = ""+data.pack.itm.(@id==pointer).@nameStr+" - "+String(puzzlePointer+1)
			uiMenu.alpha = 0;
			animT = 0;
			anim = "interface-uimenu";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animUIMenuToInterface(e:MouseEvent):void{
			stopUIMenuScreen();
			animT = 0;
			anim = "uimenu-interface";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animUIMenuToPuzzle(e:MouseEvent):void{
			stopUIMenuScreen();
			addChild(fScreen);
			fScreen.alpha = 0;
			animT = 0;
			anim = "uimenu-puzzle";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animInteruptToPuzzle(e:MouseEvent):void{
			stopInteruptScreen();
			addChild(fScreen);
			errors = new Array();
			animT = 0;
			anim = "interupt-puzzle";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animMainToLoad(e:MouseEvent):void{
			stopMainMenu();
			addChild(lScreen);
			lScreen.alpha=0;
			lScreen.inpTxt.text = "";
			animT = 0;
			anim = "main-load";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animLoadToMain():void{
			stopLoadScreen();
			animT = 0;
			anim = "load-main";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animInterupt():void{
			animT = 0;
			anim = "interupt";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
			addChild(iScreen);
			if(vic == true){
				iScreen.gotoAndStop(1);
				splash = cons.spl();
			}else{
				if(splash == ""){
					splash = "An Error Cccured\nSomething happened that wasn't supposed to.";
				}
				iScreen.gotoAndStop(2);
				// Change spash to reflect the error that occured
			}
			if(pointer == data.inf.@maxpack && puzzlePointer == 15){
				splash = "You finished Chromatic! Thank you so much for playing, I hope you enjoyed it. Check back later for new puzzles!\n~Alex O'Neill";
				iScreen.gotoAndStop(3);
			}
			iScreen.splash.text = splash;
			iScreen.alpha = 0;
		}
		private function animResetPuzzle():void{
			animT = 0;
			anim = "reset";
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
			addChild(fScreen);
			fScreen.alpha = 0;
		}
		private function animOpenOptions(e:MouseEvent):void{
			stopUIMenuScreen();
			anim = "openOptions";
			animT = 0;
			addChild(oScreen);
			oScreen.gotoAndStop(1);
			if(tutTog == false){
				oScreen.tutorialTog.gotoAndStop(2);
			}else{
				oScreen.tutorialTog.gotoAndStop(1);
			}
			if(musTog == false){
				oScreen.musicTog.gotoAndStop(2);
			}else{
				oScreen.musicTog.gotoAndStop(1);
			}
			if(tt == 50){
				oScreen.ttTog.gotoAndStop(1);
			}else{
				oScreen.ttTog.gotoAndStop(2);
			}
			oScreen.alpha = 0;
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		private function animCloseOptions(e:MouseEvent):void{
			stopOptions();
			anim = "closeOptions";
			animT = 0;
			stage.addEventListener(Event.ENTER_FRAME, animRenderer);
		}
		
		private function animRenderer(e:Event):void{
			if(anim == "menu-puzzle" || anim == "puzzle-menu"){
				var c:MovieClip = mScreen.getChildAt(0) as MovieClip;
			}
			if(anim == "menu-puzzle"){
				if(animT<10){
					c.ic.scaleX-=0.04;
					c.ic.scaleY-=0.04;
					c.y+=16;
					c.ic.y+=8;
					mScreen.cycleR.alpha-=0.16;
					mScreen.cycleL.alpha-=0.16;
					mScreen.loadBtn.alpha-=0.16;
					c.centering();
				}else if(animT<20){
					for(var i:int = 0;i<posList.length;i++){
						icList[i].x += (posList[i]-icList[i].x)*(0.25+(animT-10)/40);
					}
				}else if(animT == 20){
					for(i = 0;i<posList.length;i++){
						icList[i].x = posList[i];
					}
					runPuzzleMenu();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
				if(animT == 10){
					c.play();
				}
			}else if(anim == "puzzle-menu"){
				if(animT < 10){
					for(i = 0;i<posList.length;i++){
						icList[i].x += (posList[i]-icList[i].x)*(0.5);
					}
				}else if(animT<20){
					c.ic.scaleX+=0.04;
					c.ic.scaleY+=0.04;
					c.y-=16;
					c.ic.y-=8;
					mScreen.cycleR.alpha+=0.16;
					mScreen.cycleL.alpha+=0.16;
					mScreen.loadBtn.alpha+=0.16;
					c.centering();
				}else if(animT == 20){
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					addOtherButtons();
					runMainMenu();
				}
				if(animT == 0){
					c.play();
				}
				if(animT == 10){
					for(i = icList.length-1;i>=0;i--){
						removeChild(icList[i]);
					}
					icList = new Array();
					updateMainPointers();
				}
			}else if(anim == "puzzle-interface"){
				if(animT<10){
					fScreen.alpha+=0.1;
				}else if(animT == 10){
					mScreen.removeChildAt(0);
					removeChild(mScreen);
					for(i = icList.length-1;i>=0;i--){
						removeChild(icList[i]);
					}
					addChild(ui);
					prepUI();
					setChildIndex(fScreen,numChildren-1);
				}else if(animT<20){
					fScreen.alpha-=0.1;
				}else if(animT == 20){
					removeChild(fScreen);
					if(data.puzzle.(@id==puzzlePointer).(@pack==pointer).tutorial.@ex == "true" && tutTog == true){
						addChild(basicTxt);
						basicTxt.txt.text = data.puzzle.(@id==puzzlePointer).(@pack==pointer).tutorial.@t1;
						basicTxt.alpha = 0;
					}else{
						runUI();
						stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					}
					
				}else if(animT<30){
					basicTxt.alpha+=0.1;
				}else if(animT == 30){
					basicTxt.alpha = 1;
				}else if(animT == 38){
					basicTxt.txt.appendText("\nClick Anywhere to Continue");
					stage.addEventListener(MouseEvent.CLICK, clickToUI);
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
				
			}else if(anim == "interface-uimenu"){
				if(animT<12){
					uiMenu.alpha+=1/12;
				}else if(animT == 12){
					uiMenu.alpha = 1;
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					runUIMenuScreen();
				}
			}else if(anim == "uimenu-interface"){
				if(animT<12){
					uiMenu.alpha-=1/12;
				}else if(animT == 12){
					uiMenu.alpha = 0;
					removeChild(uiMenu);
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					runUI();
				}
			}else if(anim == "uimenu-puzzle" || anim == "interupt-puzzle"){
				if(animT<10){
					fScreen.alpha+=0.1;
				}else if(animT == 10){
					addChild(mScreen);
					mScreen.version_text.text = data.versionData.@data;
					mScreen.cycleR.alpha=0;
					mScreen.cycleL.alpha=0;
					mScreen.loadBtn.alpha=0;
					var p:PackSelectionIcon = new PackSelectionIcon();
					mScreen.addChildAt(p,0);
					p.x = 120;
					p.y = 320;
					p.ic.y+=80;
					p.ic.scaleX = 0.6;
					p.ic.scaleY = 0.6;
					p.gotoAndStop(12);
					p.centering();
					p.titleTxt.text = data.pack.itm.(@id==pointer).@nameStr;
					p.ic.numTxt.text = countSaves(pointer)+"/16";
					p.ic.sym.gotoAndStop(checkSaveDym(pointer));
					icList = new Array();
					for(i = 0;i<16;i++){
						var ic:PuzzleIcon = new PuzzleIcon();
						if(saveData[pointer][i] == 1){
							ic.gotoAndStop(2);
						}else if(saveData[pointer][i] == 2){
							ic.gotoAndStop(3);
						}
						ic.x = (i%4)*70+60;
						ic.y = (Math.floor(i/4))*70+100;
						ic.numTxt.text = ""+(i+1);
						addChild(ic);
						icList.push(ic);
					}
					if(anim == "uimenu-puzzle"){
						removeChild(uiMenu);
					}else{
						removeChild(iScreen);
					}
					for(i = tiles.length-1;i>=0;i--){
						ui.removeChild(tiles[i]);
					}
					for(i = filterObjects.length-1;i>=0;i--){
						ui.removeChild(filterObjects[i]);
					}
					for(i = pipeBtns.length-1;i>=0;i--){
						if(tabState == "wrench"){
							ui.tabs.removeChild(pipeBtns[i]);
						}else{
							ui.removeChild(pipeBtns[i]);
						}
					}
					for(i = inoutSyms.length-1;i>=0;i--){
						ui.removeChild(inoutSyms[i]);
					}
					removeChild(ui);
					pipeBtns = new Array();
					tiles = new Array();
					inoutSyms = new Array();
					filterList = new Array();
					filterObjects = new Array();
					setChildIndex(fScreen,numChildren-1);
				}else if(animT<20){
					fScreen.alpha-=0.1;
				}else if(animT == 20){
					removeChild(fScreen);
					var cp:MovieClip = mScreen.getChildAt(0) as MovieClip; // WHAT THE HECK DOES THIS DO???
					runPuzzleMenu();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					
				}
			}else if(anim == "cycle-packs"){
				for(i = 0;i<data.pack.itm.length();i++){
					mScreen.getChildAt(i).x+=(posList[i]-mScreen.getChildAt(i).x)*0.25;
					if(animT>16){
						mScreen.getChildAt(i).x = posList[i];
					}
				}
				if(animT>16){
					runMainMenu();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
			}else if(anim == "main-load"){
				if(animT<12){
					lScreen.alpha+=1/12;
				}else if(animT == 12){
					lScreen.alpha = 1;
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					runLoadScreen();
				}
			}else if(anim == "load-main"){
				if(animT<12){
					lScreen.alpha-=1/12;
				}else if(animT == 12){
					lScreen.alpha = 0;
					removeChild(lScreen);
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					runMainMenu();
				}
			}else if(anim == "interupt"){
				if(animT>=25 && animT<45){
					iScreen.alpha+=0.05;
				}else if(animT==45){
					//errors = new Array();
					stage.removeEventListener(Event.ENTER_FRAME, uiRenderNicer);
					iScreen.alpha = 1;
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					runInteruptScreen();
				}
			}else if(anim == "reset"){
				if(animT < 10){
					fScreen.alpha+=0.1;
				}else if(animT == 10){
					//Save Puzzle Framework: Tiles, Labels, Rotations, Pressure
					removeChild(iScreen);
					for(i = tiles.length-1;i>=0;i--){
						ui.removeChild(tiles[i]);
					}
					for(i = filterObjects.length-1;i>=0;i--){
						ui.removeChild(filterObjects[i]);
					}
					for(i = pipeBtns.length-1;i>=0;i--){
						if(tabState == "wrench"){
							ui.tabs.removeChild(pipeBtns[i])
						}else{
							ui.removeChild(pipeBtns[i]);
						}
					}
					for(i = inoutSyms.length-1;i>=0;i--){
						ui.removeChild(inoutSyms[i]);
					}
					filterObjects = new Array();
					filterList = new Array();
					pipeBtns = new Array();
					tiles = new Array();
					inoutSyms = new Array();
					prepUI(!vic)
					prepSavedUI();
					setChildIndex(fScreen,numChildren-1);
				}else if(animT <=20){
					fScreen.alpha-=0.1;
				}else if(animT == 21){
					removeChild(fScreen);
					if(vic==true && data.puzzle.(@id==puzzlePointer).(@pack==pointer).tutorial.@ex == "true" && tutTog == true){
						addChild(basicTxt);
						basicTxt.txt.text = data.puzzle.(@id==puzzlePointer).(@pack==pointer).tutorial.@t1;
						basicTxt.alpha = 0;
					}else{
						runUI();
						stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
					}
				}else if(animT<31){
					basicTxt.alpha+=0.1;
				}else if(animT == 31){
					basicTxt.alpha = 1;
				}else if(animT == 39){
					basicTxt.txt.appendText("\nClick Anywhere to Continue");
					stage.addEventListener(MouseEvent.CLICK, clickToUI);
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
			}else if(anim == "click-to-ui"){
				if(animT<10){
					basicTxt.alpha-=0.1;
				}else if(animT == 10){
					removeChild(basicTxt);
					runUI();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
			}else if(anim == "openOptions"){
				if(animT<10){
					oScreen.alpha+=0.1;
				}else if(animT == 10){
					oScreen.alpha = 1;
					runOptions();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
			}else if(anim == "closeOptions"){
				if(animT<10){
					oScreen.alpha-=0.1;
				}else if(animT == 10){
					oScreen.alpha = 0;
					removeChild(oScreen);
					runUIMenuScreen();
					stage.removeEventListener(Event.ENTER_FRAME, animRenderer);
				}
			}
			animT++;
		}
		
		// Save Data Things
		
		private function createSaveData(typ:String,code:String = ""):void{
			for(var i:int = 0;i<data.pack.itm.length();i++){
				saveData[data.pack.itm[i].@id] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
			}
			saveData[0][0] = 1;
			// 0 = Locked
			// 1 - Unlocked
			// 2 - Completed
			// 3 - Skipped --- UNUSED ---
		}
		private function countSaves(j:int):String{
			var count:int = 0;
			for(var i:int = 0;i<16;i++){
				if(saveData[j][i] == 2){
					count++;
				}
			}
			return(String(count));
		}
		private function checkSaveDym(j:int):int{
			if(saveData[j][0] == 0){
				return(3);
			}
			if(saveData[j][15] == 2){
				return(1);
			}
			return(2);
		}
		private function openAllFirstPacks():void{
			for(var i:int = 0;i<saveData.length;i++){
				if(saveData[i][0] == 0){
					saveData[i][0] = 1;
				}
			}
		}
		private function fixSaves():void{
			if(saveData[0][15] == 2){
				for(var i:int = 0;i<saveData.length;i++){
					if(saveData[i][0] == 0){
						saveData[i][0] = 1;
					}
				}
			}
		}
		private function fixSaveData():void{
			while(saveData.length<data.pack.itm.length()){
				saveData.push([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
			}
			fixSaves();
		}
		
	} // End of Class
	
} // End of Package
