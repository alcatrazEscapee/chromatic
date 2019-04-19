package  Elements{
	import flash.display.MovieClip;
	public class ErrorObject extends MovieClip{

		public var xsp:Number = 0;
		public var ysp:Number = 0;
		
		public function ErrorObject() {
			this.width*=Math.random()/2+1;
			this.height*=Math.random()/2+1;
		}
		
		public function emove():void{
			this.x+=xsp;
			this.y+=ysp;
			xsp*=0.96;
			ysp*=0.96;
			this.alpha-=(0.005 + 0.025*(1-this.alpha));
		}
		

	}
	
}
