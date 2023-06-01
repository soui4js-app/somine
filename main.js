import * as soui4 from "soui4";
import * as std from "std";
import * as os from "os";

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
	{rows:9,cols:9,mines:9},
	{rows:16,cols:16,mines:40},
	{rows:16,cols:30,mines:99}
];

const base_id=1000;

class MineBoard{
	constructor(mainDlg){
		this.mainDlg = mainDlg;
		this.opened = 0;
	}
	
	reset(rows,cols,mines){
		this.opened = 0;
		this.flags = 0;
		this.board = [];
		this.rows = rows;
		this.cols = cols;
		this.mines = mines;

		for(let i=0;i<this.rows;i++){
			this.board.push([]);
			for(let j=0;j<this.cols;j++){
				this.board[i].push({mine:false,state:Status.init});
			}
		}
		for(let i=0;i<this.mines;i++){
			let x = Math.floor(Math.random()*this.cols);
			let y = Math.floor(Math.random()*this.rows);
			if(!this.board[y][x].mine){
				this.board[y][x].mine=true;
			}else {
				//regenerate position.
				i--;
			}
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

	getRemain(){
		return this.mines-this.flags;
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
		if(this.getState(x,y)==state)
			return;
		if(this.getState(x,y)==Status.flag_mine)
			this.flags--;
		else if(state == Status.flag_mine)
			this.flags++;
		this.board[y][x].state = state;
		if(state==Status.nomine){
			this.opened++;
		}
		this.mainDlg.onSetGridState(this.mode,x,y,state);
	}

	setMine(x,y,isMine){
		if(this.getState(x,y)!=Status.init)
			return true;
		let state = isMine?Status.flag_mine:Status.nomine;
		if(this.board[y][x].mine && !isMine)
		{
			state = Status.mine;
		}
		this.setState(x,y,state);
		if(state == Status.mine){
			//failed!
			this.mainDlg.onResult(false);
			return false;
		}
		else if(this.opened == (this.cols*this.rows-this.mines)){
			//succeed!
			this.mainDlg.onResult(true);
			return false;
		}
		if(!isMine){
			this.autoExplore(x,y);
		}
		return true;
	}

	collectInitNeighbours(x,y){
		let ret=[];
		let x1=x-1;
		let x2=x+1;
		let y1=y-1;
		let y2=y+1;
		x1 = Math.max(x1,0);
		x2 = Math.min(x2,this.cols-1);
		y1 = Math.max(y1,0);
		y2 = Math.min(y2,this.rows-1);

		for(let i=y1;i<=y2;i++){
			for(let j=x1;j<=x2;j++){
				if(i==y && j==x)
					continue;
				if(this.board[i][j].state == Status.init)
					ret.push({x:j,y:i});
			}
		}
		return ret;
	}

	autoExplore(x,y){
		if(this.board[y][x].state!=Status.nomine)
			return false;
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
		let bContinue = true;
		if(marked == mines){
			//auto explore other hided grid
			for(let i=y1;i<=y2 && bContinue;i++){
				for(let j=x1;j<=x2 && bContinue;j++){
					if(i==y && j==x)
						continue;
					if(this.board[i][j].state == Status.init)
					{
						bContinue = this.setMine(j,i,false);						
					}
				}
			}
		}
		return bContinue;	
	}

	getGrids(){
		return this.rows*this.cols;
	}
}

const Mode={
	easy:0,
	middle:1,
	hard:2,
};

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.mode = Mode.easy;
		this.board = new MineBoard(this);
		this.enableQuestion=true;
		this.clickGrid={x:-1,y:-1};
		this.bothClick = false;
		this.timer = null;
		this.time_cost = 0;
	}

	onResult(bSucceed){
		console.log("game over");
		let stack_result = this.FindIChildByName("stack_result");
		stack_result.SetVisible(true,true);
		let stackApi = soui4.QiIStackView(stack_result);
		stackApi.SelectView(bSucceed?0:1,true);
		stackApi.Release();
		this.endTick();
	}

	onSetGridState(mode,x,y,state){
		let board = this.FindIChildByName("wnd_board");
		let idx = this.board.cord2index(x,y);
		let grid = board.FindIChildByID(base_id+idx);
		let stackApi = soui4.QiIStackView(grid);
		stackApi.SelectView(state,true);
		if(state == Status.nomine){
			let img = grid.FindIChildByName("page_num");
			let imgApi = soui4.QiIImageWnd(img);
			let mines = this.board.getRoundMines(x,y);
			imgApi.SetIcon(mines);
			imgApi.Release();
		}
		stackApi.Release();
		let txt_mine = this.FindIChildByName("txt_mine");
		txt_mine.SetWindowText(""+this.board.getRemain());
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
			if(id>=base_id && id<base_id+this.board.getGrids()){
				let cord = this.board.index2cord(id - base_id);
				let clickId = evt.clickId;
				let flags = evt.uFlags;
				if((clickId==soui4.MOUSE_LBTN_DOWN && (flags&soui4.MK_RBUTTON))
				||(clickId==soui4.MOUSE_RBTN_DOWN && (flags&soui4.MK_LBUTTON))){
					this.bothClick = true;
					this.onBothClick(cord.x,cord.y);
				}else if(clickId == soui4.MOUSE_LBTN_DOWN)
				{
					this.clickGrid = cord;
				}else if(clickId == soui4.MOUSE_RBTN_DOWN){
					this.clickGrid = cord;
				}
				else if(clickId == soui4.MOUSE_LBTN_UP)
				{
					if(this.bothClick){
						this.clickGrid.x = -1;
						this.onBothRelease(cord.x,cord.y);
						this.bothClick=false;
					}
					else if(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover)
						this.onClickGrid(cord.x,cord.y);
				}	
				else if(clickId == soui4.MOUSE_RBTN_UP){
					if(this.bothClick){
						this.clickGrid.x = -1;
						this.onBothRelease(cord.x,cord.y);
						this.bothClick=false;
					}
					else if(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover)
						this.onRclickGrid(cord.x,cord.y);
				}
			}
		}
		return false;
	}

	onTick(){
		this.time_cost++;
		let wnd_time = this.FindIChildByName("txt_time_cost");
		wnd_time.SetWindowText(""+this.time_cost);
		this.timer = os.setTimeout(this.onTick, 1000,this);
	}

	checkTick(){
		if(this.timer!=null)
			return;
		this.time_cost = 0;
		this.timer = os.setTimeout(this.onTick, 1000,this);
	}

	endTick(){
		if(this.timer!=null){
			os.clearTimeout(this.timer);
			this.timer = null;
		}
	}

	onBothRelease(x,y){
		console.log("onBothRelease",y,x);
		let neighbours = this.board.collectInitNeighbours(x,y);
		let board = this.FindIChildByName("wnd_board");
		for(let i=0;i<neighbours.length;i++){
			let idx = this.board.cord2index(neighbours[i].x,neighbours[i].y);
			board.FindIChildByID(base_id+idx).FindIChildByID(base_id+idx).SetCheck(false);
		}
		this.board.autoExplore(x,y);
	}

	onBothClick(x,y){
		console.log("onBothClick",y,x);
		this.checkTick();
		let neighbours = this.board.collectInitNeighbours(x,y);
		let board = this.FindIChildByName("wnd_board");
		for(let i=0;i<neighbours.length;i++){
			let idx = this.board.cord2index(neighbours[i].x,neighbours[i].y);
			board.FindIChildByID(base_id+idx).FindIChildByID(base_id+idx).SetCheck(true);
		}
	}

	onClickGrid(x,y){
		if(this.board.getState(x,y)!=Status.init)
			return;
		console.log("onClickGrid",y,x);
		this.checkTick();
		this.board.setMine(x,y,false);
	}
	
	onRclickGrid(x,y){
		let stat = this.board.getState(x,y);
		if(stat==Status.nomine)
			return;
		console.log("onRclickGrid",y,x);
		this.checkTick();
		if(stat == Status.init)
			this.board.setMine(x,y,true);
		else {
			if(this.enableQuestion){
				if(stat == Status.flag_mine)
					this.board.setState(x,y,Status.flag_ques);
				else if(stat == Status.flag_ques)
					this.board.setState(x,y,Status.init);
			}else if(stat == Status.flag_mine)
			{
				this.board.setState(x,y,Status.init);				
			}
		}
	}

	onEnableQuestion(e){
		let wnd = soui4.toIWindow(e.Sender());
		this.enableQuestion = wnd.IsChecked();
	}

	onOptBtn(e){
		let id = e.Sender().GetID();
		this.onInitBoard(id-200);
		this.onBtnReset(e);
	}

	
	buildBoard(mode){
		let rows = boardInfo[mode].rows
		let cols =boardInfo[mode].cols;
		let grids = rows * cols;

		let head="<t:g.mine>";
		let tail="</t:g.mine>";
		let xml="";
		
		for(let i=0;i<grids;i++){
			let y = Math.floor(i / cols);
			let x = i%cols;
			let ele = "<data id=\""+(base_id+i)+"\" data=\""+(base_id+i)+"\"" +"/>";
			xml += head+ele+tail;
		}
		return xml;
	}

	onInitBoard(mode){
		this.mode = mode;
		let board = this.FindIChildByName("wnd_board");
		board.DestroyAllChildren();
		board.SetAttribute("columnCount",""+boardInfo[mode].cols,false);
		board.CreateChildrenFromXml(this.buildBoard(mode));
		board.RequestRelayout();
	}

	onReset(){
		let bi = boardInfo[this.mode];
		this.board.reset(bi.rows,bi.cols,bi.mines);
		let board = this.FindIChildByName("wnd_board");
		for(let y=0;y<bi.rows;y++){
			for(let x=0;x<bi.cols;x++){
				let gridStack = board.FindIChildByID(base_id+this.board.cord2index(x,y));
				let stackApi = soui4.QiIStackView(gridStack);
				stackApi.SelectView(0,false);
				stackApi.Release();
			}
		}
		let txt_mine=this.FindIChildByName("txt_mine");
		txt_mine.SetWindowText(""+this.board.getRemain());
		let txt_time = this.FindIChildByName("txt_time_cost");
		txt_time.SetWindowText("0");
	}

	onBtnReset(e){
		this.onReset();
		let stack_result = this.FindIChildByName("stack_result");
		stack_result.SetVisible(false,true);
	}

	init(){
		console.log("init");
		soui4.SConnect(this.FindIChildByName("chk_enable_ques"),soui4.EVT_CMD,this,this.onEnableQuestion);
		soui4.SConnect(this.FindIChildByID(200),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByID(201),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByID(202),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByName("btn_reset"),soui4.EVT_CMD,this,this.onBtnReset);
		this.onInitBoard(Mode.easy);
		this.onReset();
	}

	uninit(){
		//do uninit.
		//note: must check the timer and stop it if existed.
		this.endTick();
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