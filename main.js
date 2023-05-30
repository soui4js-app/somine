import * as soui4 from "soui4";
import * as std from "std";
var g_workDir="";

const Status ={
	init:0,		//init
	flag_mine:1, //mark as mine
	flag_wrong:2,//reveal wrong
	flag_ques:3, //mark as question
	mine:4,		 //explored
	nomine:5,    //confirmed
};

//定义一个全局的信息
const boardInfo = [
	[9,9,9],
	[16,16,20],
	[30,16,99]
];

const base_id=1000;

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
		if(this.mode == 0){
			for(let i=0;i<this.rows;i++){
				let states= new Array(this.cols);
				for(let j=0;j<this.cols;j++){
					states[j] = this.board[i][j].mine?1:0;
				}
				console.log(states);
			}
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

	getState(x,y){
		return this.board[y][x].state;
	}

	setState(x,y,state){
		this.board[y][x].state = state;//set to question
		this.mainDlg.onSetGridState(this.mode,x,y,state);
	}

	setMine(x,y,isMine){
		this.board[y][x].state = isMine?Status.flag_mine:Status.nomine; //guess is as mine
		if(this.board[y][x].mine && !isMine)
		{
			this.board[y][x].state = Status.mine;
			console.log("you clicked a mine",y,x);
		}	
		this.mainDlg.onSetGridState(this.mode,x,y,this.board[y][x].state);
		if(!this.board[y][x].mine && !isMine){
			return this.autoExplore(x,y);
		}else{
			return this.board[y][x].state != Status.mine;
		}
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

		let marked = 0;
		for(let i=y1;i<=y2;i++){
			for(let j=x1;j<=x2;j++){
				if(i==y && j==x)
					continue;
				if(this.board[i][j].state == Status.flag_mine)
					marked++;
			}
		}
		let ret = true;
		if(marked == mines){
			//auto explore other hided grid
			for(let i=y1;i<=y2 && ret;i++){
				for(let j=x1;j<=x2 && ret;j++){
					if(i==y && j==x)
						continue;
					if(this.board[i][j].state == Status.init)
					{
						ret = this.setMine(j,i,false);
						if(!ret){
							console.log("explore error",i,j);
						}
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


class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.board = [];
		for(let i=0;i<3;i++){
			this.board.push(new MineBoard(i,this));
		}
		this.mode = 0;
		this.enableQuestion=true;
		this.clickGrid={x:-1,y:-1};
	}

	onSetGridState(mode,x,y,state){
		//update state
		console.log("onSetGridState",mode,y,x,state);
		const board_names=["board_easy","board_middle","board_hard"];
		let board = this.FindIChildByName(board_names[this.mode]);
		let idx = this.getCurBoard().cord2index(x,y);
		let grid = board.FindIChildByID(base_id+idx);
		let stackApi = soui4.QiIStackView(grid);
		stackApi.SelectView(state,true);
		if(state == Status.nomine){
			let img = grid.FindIChildByName("page_num");
			let imgApi = soui4.QiIImageWnd(img);
			let mines = this.getCurBoard().getRoundMines(x,y);
			imgApi.SetIcon(mines);
			imgApi.Release();
		}
		stackApi.Release();
	}

	getCurBoard(){
		return this.board[this.mode];
	}

	onEvent(e){
		let evt_id = e.GetID();
		if(evt_id==soui4.EVT_INIT){//event_init
			this.init();
		}else if(evt_id==soui4.EVT_EXIT){
			this.uninit();
		}else if(evt_id==soui4.EVT_MOUSE_CLICK){
			let evt = soui4.toEventMouseClick(e);
			let id = e.Sender().GetID();
			if(id>=base_id && id<base_id+this.getCurBoard().getGrids()){
				let cord = this.getCurBoard().index2cord(id - base_id);
				let clickId = evt.clickId;
				let flags = evt.uFlags;
				if((clickId==soui4.MOUSE_LBTN_DOWN && (flags&soui4.MK_RBUTTON))
				||(clickId==soui4.MOUSE_RBTN_DOWN && (flags&soui4.MK_LBUTTON))){
					console.log("click both button");
					this.clickGrid.x=-1;
				}else if(clickId == soui4.MOUSE_LBTN_DOWN)
				{
					this.clickGrid = cord;
				}else if(clickId == soui4.MOUSE_RBTN_DOWN){
					this.clickGrid = cord;
				}
				else if(clickId == soui4.MOUSE_LBTN_UP)
				{
					if(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover)
						this.onClickGrid(cord.x,cord.y);
				}	
				else if(clickId == soui4.MOUSE_RBTN_UP){
					if(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover)
						this.onRclickGrid(cord.x,cord.y);
				}
			}
		}
		return false;
	}
	
	onClickGrid(x,y){
		if(this.getCurBoard().getState(x,y)!=Status.init)
			return;
		console.log("onClickGrid",y,x);
		this.getCurBoard().setMine(x,y,false);
	}
	
	onRclickGrid(x,y){
		let stat = this.getCurBoard().getState(x,y);
		if(stat==Status.nomine)
			return;
		console.log("onRclickGrid",y,x);
		if(stat == Status.init)
			this.getCurBoard().setMine(x,y,true);
		else {
			if(this.enableQuestion){
				if(stat == Status.flag_mine)
					this.getCurBoard().setState(x,y,Status.flag_ques);
				else if(stat == Status.flag_ques)
					this.getCurBoard().setState(x,y,Status.init);
			}else if(stat == Status.flag_mine)
			{
				this.getCurBoard().setState(x,y,Status.init);				
			}
		}
	}

	onEnableQuestion(e){
		let wnd = soui4.toIWindow(e.Sender());
		this.enableQuestion = wnd.IsChecked();
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

		soui4.SConnect(this.FindIChildByName("chk_enable_ques"),soui4.EVT_CMD,this,this.onEnableQuestion);
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