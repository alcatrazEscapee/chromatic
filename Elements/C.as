package  Elements{
	import flash.display.MovieClip;
	public class C extends MovieClip{

		private var SplashList:Array = 
		[
		"Tip #01 - Use labels to help you remember which colours go where on large puzzles.",
		"Tip #02 - Mixers don't require labels since they only have one output.",
		"Tip #03 - Separators require at least one labeled output to work properly.",
		"Tip #04 - colour pumped into an incorrectly labeled pipe will overflow.",
		"Tip #05 - colour pumped into a pipe of the wrong pressure will overflow.",
		"Tip #06 - Click on inputs and outputs for extra information about that input or output.",
		"Tip #07 - An incorrectly labeled mixer or separator will overflow once colour reaches it.",
		"Tip #08 - You cannot run puzzles unless all pipes are connected to each other: no loose ends.",
		"Tip #09 - Each part of a crossover pipe can be labeled separately.",
		"Tip #10 - Each part of a crossover pipe can be a different pressure",
		"Tip #11 - To remove a label, you can use a different label, or replace the pipe.",
		"Tip #12 - To revert a pipe to low pressure, use the pressure down button.",
		"Tip #13 - To increase the pressure of a pipe, use the pressure up button.",
		"Tip #14 - Remember: mixers and separators only work with low (x1) pressure colour.",
		"Tip #15 - Puzzles won't run unless all pipes are connected to something.",
		"Tip #16 - Click on outputs or inputs to see the colour, pressure and how to make the colour.",
		"Tip #17 - You can turn off tutorials in the options menu.",
		"Tip #18 - You can turn off the music in the options menu.",
		"Tip #19 - Use the save ID: \"sandbox\" to unlock all puzzles.",
		"Tip #20 - Using the sandbox save ID will clear your current completed puzzles.",
		"Tip #21 - Use the save ID: \"reset\" to clear your save game, and return to the beginning.",
		"Tip #22 - If you complete the first pack (Welcome to the Factory), it will unlock level one of all other packs!",
		"Tip #23 - Filters can convert color of any pressure to a different color of the same pressure."
		]
		
		public function C() {
			// constructor code
		}
		public function spl():String{
			return(SplashList[Math.floor(Math.random()*SplashList.length)]);
		}

	}
	
}
