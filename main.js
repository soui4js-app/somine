import * as soui4 from "soui4";
import * as os from "os";
import * as std from "std";
import * as utils from "utils.dll";

var g_workDir="";

const Status ={
	init:0,		//init
	flag_mine:1, //mark as mine
	flag_wrong:2,//reveal wrong
	flag_ques:3, //mark as question
	exploded:4,	 //exploded
	clear:5,     //clear
};

//定义一个全局的信息
const boardInfo = [
	{rows:9,cols:9,mines:9,helpTimes:0},
	{rows:16,cols:16,mines:40,helpTimes:1},
	{rows:16,cols:30,mines:99,helpTimes:2}
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
		if(state==Status.clear){
			this.opened++;
		}
		this.mainDlg.onSetGridState(this.mode,x,y,state);
	}

	isMine(x,y){
		return this.board[y][x].mine;
	}

	getSafeGrid(){
		for(let y=0;y<this.rows;y++){
		for(let x=0;x<this.cols;x++){
			if(this.getState(x,y)==Status.init && !this.board[y][x].mine)
			{
				return {x:x,y:y};
			}
		}
		}
		return {x:-1,y:-1};
	}

	setMine(x,y,isMine){
		if(this.getState(x,y)!=Status.init)
			return true;
		let state = isMine?Status.flag_mine:Status.clear;
		if(this.board[y][x].mine && !isMine)
		{
			state = Status.exploded;
		}
		this.setState(x,y,state);
		if(state == Status.exploded){
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
		if(this.board[y][x].state!=Status.clear)
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

const id_mode_base = 200;
const id_chk_enable_ques=300;

class OptionDlg extends soui4.JsHostDialog{
	constructor(settings){
		super("layout:dlg_option");
		this.settings = {...settings};//{mode:0,enable_ques:true}
		this.onEvt = this.onEvent;
	}

	onEvent(e){
		let evt_id = e.GetID();
		switch(evt_id){
			case soui4.EVT_INIT:
				this.onInit();
				break;
			case soui4.EVT_EXIT:
				this.onUninit();
				break;
			case soui4.EVT_STATECHANGED:
				this.onStateChanged(e);
				break;
		}
	}

	isEventCheck(e){
		let evtStateChanged = soui4.toEventSwndStateChanged(e);
		if(!evtStateChanged)
			return false;
		return (evtStateChanged.dwOldState&soui4.WndState_Check) != (evtStateChanged.dwNewState&soui4.WndState_Check)
	}

	onStateChanged(e){
		if(!this.isEventCheck(e))
			return;
		let id = e.Sender().GetID();
		let wnd = soui4.toIWindow(e.Sender());

		switch(id){
			case id_mode_base+Mode.easy:
			case id_mode_base+Mode.middle:
			case id_mode_base+Mode.hard:
				{
					if(wnd.IsChecked())
						this.settings.mode = id-id_mode_base;
				}
				break;
			case id_chk_enable_ques:
				this.settings.enableQuestion=wnd.IsChecked();
				break;
		}
	}

	onInit(){
		//defind 2 id, value is defined in dlg_option.xml
		this.FindIChildByID(id_mode_base+this.settings.mode).SetCheck(true);
		this.FindIChildByID(id_chk_enable_ques).SetCheck(this.settings.enableQuestion);
	}

	onUninit(){
		this.onEvt = null;
	}
}

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.settings={mode:Mode.easy,enableQuestion:true};
		let f = std.open(g_workDir+"\\settings.json", "r");
		if(f!=null){
			let settingStr = f.readAsString();
			this.settings = JSON.parse(settingStr);	
			f.close();
		}

		this.board = new MineBoard(this);
		this.clickGrid={x:-1,y:-1};
		this.bothClick = false;
		this.timer = null;
		this.time_cost = 0;
		this.helpTimes = 0;
		this.help_cost = 0;
	}

	playSound(bWin){
		let sound = g_workDir+"\\Sound\\";
		sound += bWin?"win.wav":"lose.wav";
		utils.PlaySound(sound,false);
	}
	onResult(bSucceed){
		console.log("game over");
		let stack_result = this.FindIChildByName("stack_result");
		let stackApi = soui4.QiIStackView(stack_result);
		stackApi.SelectPage(-1,false);
		stack_result.SetVisible(true,true);
		stackApi.SelectPage(bSucceed?0:1,true);
		stackApi.Release();
		this.endTick();
		if(!bSucceed){
			//open all mines
			for(let y=0;y<this.board.rows;y++){
				for(let x=0;x<this.board.cols;x++)
				{
					let state = -1;
					if(this.board.isMine(x,y)){
						if(this.board.getState(x,y)==Status.init){
							state = Status.exploded;
						}
					}else if(this.board.getState(x,y)==Status.flag_mine)
					{
						state = Status.flag_wrong;
					}
					if(state != -1){
						let idx = this.board.cord2index(x,y);
						let grid = this.FindIChildByID(base_id+idx).FindIChildByName("stack_state");
						let stackApi = soui4.QiIStackView(grid);
						stackApi.SelectPage(state,true);
						stackApi.Release();
					}
				}
			}
		}
		this.playSound(bSucceed);
	}

	onSetGridState(mode,x,y,state){
		let board = this.FindIChildByName("wnd_board");
		let idx = this.board.cord2index(x,y);
		let grid = board.FindIChildByID(base_id+idx).FindIChildByName("stack_state");
		let stackApi = soui4.QiIStackView(grid);
		stackApi.SelectPage(state,true);
		if(state == Status.clear){
			let img = stackApi.GetPage(state);
			let imgApi = soui4.QiIImageWnd(img);
			let mines = this.board.getRoundMines(x,y);
			imgApi.SetIcon(mines);
			imgApi.Release();
		}
		stackApi.Release();
		this.setRemainMine(this.board.getRemain());
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
					this.onGridClick(cord.x,cord.y);
				}else if(clickId == soui4.MOUSE_RBTN_DOWN){
					this.clickGrid = cord;
				}
				else if(clickId == soui4.MOUSE_LBTN_UP)
				{
					let bCancel = !(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover);
					if(this.bothClick){
						this.onBothRelease(cord.x,cord.y,bCancel);
						this.bothClick=false;
					}else
					{
						this.onGridCmd(cord.x,cord.y,bCancel);
					}
					this.clickGrid.x = -1;											
				}	
				else if(clickId == soui4.MOUSE_RBTN_UP){
					let bCancel = !(cord.x == this.clickGrid.x && cord.y == this.clickGrid.y && evt.bHover);
					if(this.bothClick){
						this.onBothRelease(cord.x,cord.y,bCancel);
						this.bothClick=false;
					}
					else if(!bCancel)
						this.onGridRclick(cord.x,cord.y);
					this.clickGrid.x = -1;	
				}
			}
		}
		return false;
	}

	setDigit(digitName,digit){
		let stack=this.FindIChildByName(digitName);
		if(stack!=0){
			let stackApi=soui4.QiIStackView(stack);
			stackApi.SelectPage(digit,true);
			stackApi.Release();
		}
	}

	setRemainMine(mines){
		let dig0 = mines%10;
		let dig1 = mines/10%10;
		this.setDigit("digit_mine_0",dig0);
		this.setDigit("digit_mine_1",dig1);
	}

	setTimeCost(num){
		let dig0 = num%10;
		let dig1 = num/10%10;
		let dig2 = num/100%10;
		this.setDigit("digit_time_0",dig0);
		this.setDigit("digit_time_1",dig1);
		this.setDigit("digit_time_2",dig2);
	}
	onTick(){
		this.time_cost++;
		this.setTimeCost(this.time_cost);
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

	onBothRelease(x,y,bCancel){
		console.log("onBothRelease",y,x,bCancel);
		let neighbours = this.board.collectInitNeighbours(x,y);
		for(let i=0;i<neighbours.length;i++){
			this.gridPress(neighbours[i].x,neighbours[i].y,false);
		}
		if(!bCancel)
			this.board.autoExplore(x,y);
	}

	gridPress(x,y,isPress){
		if(this.board.getState(x,y)!=Status.init)
		{
			console.log("error, press grid which state is not init",x,y);
			return;
		}
		let board = this.FindIChildByName("wnd_board");
		let idx = this.board.cord2index(x,y);
		let stackState = board.FindIChildByID(base_id+idx).FindIChildByName("stack_state");
		let stackApi = soui4.QiIStackView(stackState);
		stackApi.SelectPage(isPress?(Status.clear+1):Status.init,true);
		stackApi.Release();
	}

	onBothClick(x,y){
		console.log("onBothClick",y,x);
		this.checkTick();
		let neighbours = this.board.collectInitNeighbours(x,y);
		for(let i=0;i<neighbours.length;i++){
			this.gridPress(neighbours[i].x,neighbours[i].y,true);
		}
	}

	onGridClick(x,y){
		if(this.board.getState(x,y)!=Status.init)
			return;
		console.log("onGridClick",y,x);
		this.checkTick();
		this.gridPress(x,y,true);
	}

	onGridCmd(x,y,bCancel){
		if(this.board.getState(x,y)!=Status.init)
			return;
		console.log("onGridCmd",y,x,bCancel);
		if(bCancel)
			this.gridPress(x,y,false);
		else
			this.board.setMine(x,y,false);
	}
	
	onGridRclick(x,y){
		let stat = this.board.getState(x,y);
		if(stat==Status.clear)
			return;
		console.log("onGridRclick",y,x);
		this.checkTick();
		if(stat == Status.init)
			this.board.setMine(x,y,true);
		else {
			if(this.settings.enableQuestion){
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

	onOptBtn(e){
		let dlgOption = new OptionDlg(this.settings);
		if(dlgOption.DoModal(this.GetHwnd())==1){//1=IDOK
			let oldSetting = {...this.settings};
			this.settings = dlgOption.settings;
			if(oldSetting.mode != this.settings.mode){
				//regenerate board
				this.onInitBoard(this.settings.mode);
				this.GetIRoot().Update();
				this.CenterWindow(0);
				this.onBtnReset(e);
			}
		}
	}

	onWinAniRepeat(e){
		this.playSound(true);
	}

	onFailAniRepeat(e){
		this.playSound(false);
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
		for(let y=0;y<bi.rows;y++){
			for(let x=0;x<bi.cols;x++){
				this.gridPress(x,y,false);
			}
		}
		this.setRemainMine(this.board.getRemain());
		if(this.timer!=null)
		{
			os.clearTimeout(this.timer);
			this.timer=null;
		}
		this.time_cost=0;
		this.setTimeCost(0);
		this.helpTimes = bi.helpTimes;
		this.help_cost = 0;
		let btnHelp=this.FindIChildByName("btn_help");
		btnHelp.SetWindowText("帮助("+(this.helpTimes - this.help_cost)+")");
		btnHelp.SetVisible(this.helpTimes>0,true);
	}

	onBtnReset(e){
		this.onReset();
		let stack_result = this.FindIChildByName("stack_result");
		stack_result.SetVisible(false,true);
	}

	onBtnHelp(e){
		if(this.time_cost>0){
			if(this.help_cost<this.helpTimes){
				let pos = this.board.getSafeGrid();
				if(pos.x!=-1)
					this.board.setMine(pos.x,pos.y,false);
				let btnHelp=this.FindIChildByName("btn_help");
				this.help_cost++;
				btnHelp.SetWindowText("帮助("+(this.helpTimes - this.help_cost)+")");		
			}
		}else{
			soui4.SMessageBox(this.GetHwnd(),"游戏还没有开始","提示",soui4.MB_OK);
		}
	}

	init(){
		console.log("init");
		soui4.SConnect(this.FindIChildByName("btn_reset"),soui4.EVT_CMD,this,this.onBtnReset);
		soui4.SConnect(this.FindIChildByName("btn_help"),soui4.EVT_CMD,this,this.onBtnHelp);
		soui4.SConnect(this.FindIChildByName("btn_option"),soui4.EVT_CMD,this,this.onOptBtn);
		soui4.SConnect(this.FindIChildByName("ani_win"),soui4.EVT_IMAGE_ANI_REPEAT,this,this.onWinAniRepeat);
		soui4.SConnect(this.FindIChildByName("ani_fail"),soui4.EVT_IMAGE_ANI_REPEAT,this,this.onFailAniRepeat);

		
		this.onInitBoard(this.settings.mode);
		this.onReset();
		this.GetIRoot().Update();
		this.CenterWindow(0);
	}

	uninit(){
		//do uninit.
		//note: must check the timer and stop it if existed.
		this.endTick();

		//save to file.
		try{
			let f = std.open(g_workDir+"\\settings.json", "w");
			let settingStr = JSON.stringify(this.settings);
			f.puts(settingStr);
			f.close();
		}catch(e){
			console.log(e);
		}
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