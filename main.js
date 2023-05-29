import * as soui4 from "soui4";
import * as std from "std";
var g_workDir="";

class MineBoard{
	constructor(rows,cols,mines){
		this.rows = rows;
		this.cols = cols;
		this.mines = mines;
		this.reset();
	}
	//state. 0 - unexplored, 1- explored, 2- marked
	reset(){
		this.board = [];
		for(let i=0;i<this.rows;i++){
			this.board.push([]);
			for(let j=0;j<this.cols;j++){
				this.board[i].push({mine:false,state:0});
			}
		}
		for(let i=0;i<this.mines;i++){
			let x = Math.floor(Math.random()*this.cols);
			let y = Math.floor(Math.random()*this.rows);
			this.board[y][x].mine=true;
		}
	}

	isMine(x,y){
		return this.board[y][x].mine;
	}

	getRoundMines(x,y){
		let x1=x-1;
		let x2=x+1;
		let y1=y-1;
		let y2=y+1;
		x1 = Math.max(x1,0);
		x2 = Math.min(x2,this.cols-1);
		y1 = Math.max(y1,0);
		y2 = Math.min(y2,this.rows-1);
		let ret = 0;
		for(let i=y1;i<=y2;i++){
			for(let j=x1;j<=x2;j++){
				if(this.board[i][j].mine)
					ret ++;
			}
		}
		return ret;
	}


}

//定义一个全局的信息
var boardInfo = [
	[9,9,9],
	[16,16,20],
	[30,16,99]
];

const base_id=1000;

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.board = [];
		for(let i=0;i<3;i++){
			this.board.push(new MineBoard(boardInfo[i][0],boardInfo[i][1],boardInfo[i][2]));
		}
	}

	onEvent(e){
		if(e.GetID()==soui4.EVT_INIT){//event_init
			this.init();
		}else if(e.GetID()==soui4.EVT_EXIT){
			this.uninit();
		}
		return false;
	}
	
	onBtnTest(e){
		console.log("you click test button");
		soui4.SMessageBox(this.GetHwnd(),"you click test button","test",soui4.MB_OK);
	}

	onOptBtn(e){
		let stack_board = this.FindIChildByName("stack_board");
		let stackApi = soui4.QiIStackView(stack_board);
		let id = e.Sender().GetID();
		stackApi.SelectView(id-200);
		this.board[id-200].reset();
		stackApi.Release();
	}

	buildBoard2(size){
		let head="<t:g.mine>";
		let tail="</t:g.mine>";
		let xml="";
		for(let i=0;i<size;i++){
			let ele = "<data id=\""+(500+i)+"\" data=\""+(base_id+i)+"\"" +" text=\"" + i+"\"" +"/>";
			xml += head+ele+tail;
		}
		return xml;
	}

	buildBoard(mode){
		let rows = boardInfo[mode][0];
		let cols =boardInfo[mode][1];
		let grids = rows * cols;

		let head="<t:g.mine>";
		let tail="</t:g.mine>";
		let xml="";
		
		for(let i=0;i<grids;i++){
			let y = Math.floor(i / cols);
			let x = i%cols;
			let ele = "<data id=\""+(500+i)+"\" data=\""+(base_id+i)+"\"" +" text=\"" + this.board[mode].getRoundMines(x,y)+"\"" +"/>";
			xml += head+ele+tail;
		}
		return xml;
	}

	init(){
		console.log("init");
		soui4.SConnect(this.FindIChildByID(200),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByID(201),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByID(202),soui4.EVT_CMD,this,this.onOptBtn);
		{
			let board = this.FindIChildByName("board_easy");
			board.CreateChildrenFromXml(this.buildBoard(0));	
		}
		{
			let board = this.FindIChildByName("board_middle");
			board.CreateChildrenFromXml(this.buildBoard(1));	
		}
		{
			let board = this.FindIChildByName("board_hard");
			board.CreateChildrenFromXml(this.buildBoard(2));	
		}

		soui4.SConnect(this.FindIChildByName("btn_test"),soui4.EVT_CMD,this,this.onBtnTest);
	}

	uninit(){
		//do uninit.
		console.log("uninit");
	}
};


function main(inst,workDir,args)
{
	soui4.log(workDir);
	g_workDir = workDir;
	let theApp = soui4.GetApp();
	let souiFac = soui4.CreateSouiFactory();
	//*
	let resProvider = souiFac.CreateResProvider(1);
	soui4.InitFileResProvider(resProvider,workDir + "\\uires");
	//*/
	/*
	// show how to load resource from a zip file
	let resProvider = soui4.CreateZipResProvider(theApp,workDir +"\\uires.zip","souizip");
	if(resProvider === 0){
		soui4.log("load res from uires.zip failed");
		return -1;
	}
	//*/
	let resMgr = theApp.GetResProviderMgr();
	resMgr.AddResProvider(resProvider,"uidef:xml_init");
	resProvider.Release();
	let hwnd = soui4.GetActiveWindow();
	let hostWnd = new MainDialog();
	hostWnd.Create(hwnd,0,0,0,0);
	hostWnd.SendMessage(0x110,0,0);//send init dialog message.
	hostWnd.ShowWindow(soui4.SW_SHOWNORMAL); 
	souiFac.Release();
	let ret= theApp.Run(hostWnd.GetHwnd());
	hostWnd=null;
	soui4.log("js quit");
	return ret;
}

globalThis.main=main;