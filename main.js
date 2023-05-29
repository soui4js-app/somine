import * as soui4 from "soui4";
import * as std from "std";
var g_workDir="";

const Status ={
	init:0,
	mark:1,
	isMine:2,
	notMine:3,
};

//定义一个全局的信息
const boardInfo = [
	[9,9,9],
	[16,16,20],
	[30,16,99]
];

class MineBoard{
	constructor(mode,mainDlg){
		this.mode = mode;
		this.mainDlg = mainDlg;
		this.rows = boardInfo[mode][0];
		this.cols = boardInfo[mode][1];
		this.mines = boardInfo[mode][2];
		this.reset();
	}
	//state. 0 - init, 1- explored, 2- marked
	reset(){
		this.board = [];
		for(let i=0;i<this.rows;i++){
			this.board.push([]);
			for(let j=0;j<this.cols;j++){
				this.board[i].push({mine:false,state:Status.init});
			}
		}
		for(let i=0;i<this.mines;i++){
			let x = Math.floor(Math.random()*this.cols);
			let y = Math.floor(Math.random()*this.rows);
			this.board[y][x].mine=true;
		}
	}

	index2cord(idx){
		let ret = {x:0,y:0};
		ret.y = Math.floor(idx/this.cols);
		ret.x = idx%this.cols;
		return ret;
	}
	cord2index(x,y){
		return y*this.cols+x;
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
				if(i == y && j== x)
					continue;
				if(this.board[i][j].mine)
					ret ++;
			}
		}
		return ret;
	}

	setMark(x,y){
		this.board[y][x].state = Status.mark;//set to question
		this.mainDlg.onSetGridState(this.mode,x,y,this.board[y][x].state);
	}

	setMine(x,y,isMine){
		this.board[y][x].state = isMine?Status.isMine:Status.notMine; //guess is as mine
		this.mainDlg.onSetGridState(this.mode,x,y,this.board[y][x].state);
		if(this.board[y][x].mine){
			if(!isMine)
				return false;
		}else{
			if(!isMine){
				this.autoExplore(x,y);
			}
		}
		return true;
	}

	getState(x,y){
		return this.board[y][x].state;
	}

	autoExplore(x,y){
		let mines = this.getRoundMines(x,y);
		let x1=x-1;
		let x2=x+1;
		let y1=y-1;
		let y2=y+1;
		x1 = Math.max(x1,0);
		x2 = Math.min(x2,this.cols-1);
		y1 = Math.max(y1,0);
		y2 = Math.min(y2,this.rows-1);

		let explored = 0;
		for(let i=y1;i<y2;i++){
			for(let j=x1;j<x2;j++){
				if(i==y && j==x)
					continue;
				if(this.board[i][j].state == Status.notMine)
					explored++;
			}
		}
		let ret = true;
		if(explored == mines){
			//auto explore other hided empty grid
			for(let i=y1;i<y2 && ret;i++){
				for(let j=x1;j<x2 && ret;j++){
					if(i==y && j==x)
						continue;
					if(this.board[i][j].state == Status.init)
					{
						ret = this.setMine(j,i,false);
					}
				}
			}
		}
		return ret;
	}

	getGrids(){
		return this.rows*this.cols;
	}
}


const base_id=1000;

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.board = [];
		for(let i=0;i<3;i++){
			this.board.push(new MineBoard(i,this));
		}
		this.mode = 0;
	}

	onSetGridState(mode,x,y,state){
		//update state
		console.log("onSetGridState",mode,y,x,state);
		const board_names=["board_easy","board_middle","board_hard"];
		let board = this.FindIChildByName(board_names[this.mode]);
		let idx = this.getCurBoard().cord2index(x,y);
		let grid = board.FindIChildByID(base_id+idx);
		let stackApi = soui4.QiIStackView(grid);
		stackApi.SelectView(1,true);
		stackApi.Release();
	}

	getCurBoard(){
		return this.board[this.mode];
	}

	onEvent(e){
		if(e.GetID()==soui4.EVT_INIT){//event_init
			this.init();
		}else if(e.GetID()==soui4.EVT_EXIT){
			this.uninit();
		}else if(e.GetID()==soui4.EVT_CMD){
			let id = e.Sender().GetID();
			if(id>=base_id && id<base_id+this.getCurBoard().getGrids()){
				let cord = this.getCurBoard().index2cord(id - base_id);
				this.onClickGrid(cord.x,cord.y);
			}
		}
		return false;
	}
	
	onClickGrid(x,y){
		console.log("onClickGrid",y,x);
		this.getCurBoard().setMine(x,y,true);
	}

	onBtnTest(e){
		console.log("you click test button");
		soui4.SMessageBox(this.GetHwnd(),"you click test button","test",soui4.MB_OK);
	}

	onOptBtn(e){
		let stack_board = this.FindIChildByName("stack_board");
		let stackApi = soui4.QiIStackView(stack_board);
		let id = e.Sender().GetID();
		stackApi.SelectView(id-200,true);
		this.board[id-200].reset();
		stackApi.Release();
		this.mode = id-200;
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
			let ele = "<data id=\""+(base_id+i)+"\" data=\""+(base_id+i)+"\"" +" text=\"" + this.board[mode].getRoundMines(x,y)+"\"" +"/>";
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