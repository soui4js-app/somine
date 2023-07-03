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

		this.board = new Array(this.rows);
		for(let i=0;i<this.rows;i++){
			this.board[i]=[];
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

	getMinePos(){
		let ret=[];
		for(let y=0;y<this.rows;y++)
		{
			for(let x=0;x<this.cols;x++){
				if(this.isMine(x,y))
				{
					ret.push({x:x,y:y});
				}
			}
		}
		return ret;
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

	//查找一个连续无雷的的位置
	findStartPos(startx,starty,xdir,ydir){
		let minRoundMines = 100;
		let x1=1,x2=this.cols-1;
		let y1=1,y2=this.rows-1;
		if(xdir>0){
			x1=startx;
		}else{
			x2=startx;
		}
		if(ydir>0){
			y1=starty;
		}else{
			y2=starty;
		}
		for(let y=y1;y<y2;y++){
			for(let x=x1;x<x2;x++){
				if(this.getState(x,y)==Status.init && !this.board[y][x].mine)
				{
					let roundMines = this.getRoundMines(x,y);
					if(roundMines<minRoundMines){
						minRoundMines=roundMines;
						if(roundMines==0)
							return {"x":x,"y":y};
					}					
				}
			}
		}
		return {x:-1,y:-1};
	}

	isMine(x,y){
		return this.board[y][x].mine;
	}

	getSafeGrid(){
		let pos=[];
		for(let y=0;y<this.rows;y++){
		for(let x=0;x<this.cols;x++){
			if(this.getState(x,y)==Status.init && !this.board[y][x].mine)
			{
				pos.push({x:x,y:y});
			}
		}
		}
		if(pos.length==0)
		{
			return {x:-1,y:-1};
		}	
		else{
			let idx = Math.floor(Math.random()*pos.length);
			return pos[idx];
		}
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
const id_chk_auto_start = 301;
const id_chk_enable_sound = 302;

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
			case id_chk_auto_start:
				this.settings.autoStart = wnd.IsChecked();
				break;
			case id_chk_enable_sound:
				this.settings.enableSound = wnd.IsChecked();
				break;
		}
	}

	onInit(){
		//defind 2 id, value is defined in dlg_option.xml
		this.FindIChildByID(id_mode_base+this.settings.mode).SetCheck(true);
		this.FindIChildByID(id_chk_enable_ques).SetCheck(this.settings.enableQuestion);
		this.FindIChildByID(id_chk_auto_start).SetCheck(this.settings.autoStart);
		this.FindIChildByID(id_chk_enable_sound).SetCheck(this.settings.enableSound);
	}

	onUninit(){
		this.onEvt = null;
	}
}

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
		this.settings={mode:Mode.easy,enableQuestion:true,autoStart:true,enableSound:true};
		let f = std.open(g_workDir+"\\settings.json", "r");
		if(f!=null){
			let settingStr = f.readAsString();
			Object.assign(this.settings,JSON.parse(settingStr));	
			f.close();
		}

		this.board = new MineBoard(this);
		this.clickGrid={x:-1,y:-1};
		this.bothClick = false;
		this.timer = null;
		this.time_cost = 0;
		this.helpTimes = 0;
		this.help_cost = 0;
		this.record=[{best:10000,win:0,fail:0,his:[]},{best:10000,win:0,fail:0,his:[]},{best:10000,win:0,fail:0,his:[]}];
		f = std.open(g_workDir+"\\record.json","r");
		if(f!=null){
			let str = f.readAsString();
			let rec = JSON.parse(str);
			for(let i=0;i<3;i++){
				Object.assign(this.record[i],rec[i]);	
			}
			f.close();
		}
	}

	playSound(file){
		if(!this.settings.enableSound)
			return;
		let sound = g_workDir+"\\Sound\\"+file;
		utils.PlaySound(sound,false);
	}
	onResult(bSucceed){
		console.log("game over");
		let record = this.record[this.mode];
		if(!bSucceed){
			record.fail++;
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
		}else{
			record.win++;
			//update record
			let now = new Date();
			let time = ""+now.getFullYear()+"/"+(now.getMonth()+1)+"/"+now.getDate()+" "+now.getHours()+":"+now.getMinutes()+":"+now.getSeconds();
			record.his.unshift({time_cost:this.time_cost,time:time});
			if(record.his.length>10){
				//max to 10 record
				record.his.splice(record.his.length-1,1);
			}
			if(this.time_cost<record.best){
				record.best = this.time_cost;
			}
			//render history view
			this.FindIChildByName("txt_best").SetWindowText(""+record.best);
			let rate = (record.win/(record.win+record.fail));
			rate = Math.round(rate*1000)/10;
			this.FindIChildByName("txt_winrate").SetWindowText(""+record.win+"/"+(record.fail+record.win)+"="+rate+"%");
			let xml=this.buildHistory(record.his);
			let wndHistory = this.FindIChildByName("wnd_history");
			wndHistory.DestroyAllChildren();
			wndHistory.CreateChildrenFromXml(xml);
		}
		//
		let stack_result = this.FindIChildByName("stack_result");
		let stackApi = soui4.QiIStackView(stack_result);
		stackApi.SelectPage(-1,false);
		stack_result.SetVisible(true,true);
		stackApi.SelectPage(bSucceed?0:1,true);
		stackApi.Release();
		this.endTick();
		if(bSucceed)
			this.onWinAniRepeat(null);
		else
			this.onFailAniRepeat(null);
	}

	buildHistory(history){
		let head="<t:g.history>";
		let tail="</t:g.history>";
		let xml="";
		
		for(let i=0;i<history.length;i++){
			let ele = "<data time_cost=\""+ history[i].time_cost +"\" time=\""+ history[i].time+"\"/>";
			xml += head+ele+tail;
		}
		return xml;
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
		if(num>999)
			return;
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

	onBtnMenu(e){
		let menu = new soui4.SMenu();
		menu.LoadMenu("smenu:help");
		let btn = soui4.toIWindow(e.Sender());
		let rc = btn.GetWindowRect();
		this.ClientToScreen2(rc);
		menu.TrackPopupMenu(0,rc.left,rc.bottom,this.GetHwnd(),0,btn.GetScale());
	}

	onWinAniRepeat(e){
		let aniImg=null;
		if(e==null){
			aniImg = this.FindIChildByName("ani_win");
		}else{
			aniImg = soui4.toIWindow(e.Sender());
		}
		let rc = aniImg.GetIParent().GetClientRect();
		let szImg = aniImg.GetDesiredSize(-1,-1);
		let x = rc.left+ Math.round(Math.random()*(rc.Width()-szImg.cx));
		let y = rc.top+ Math.round(Math.random()*(rc.Height()-szImg.cy));
		aniImg.Move2(x,y,szImg.cx,szImg.cy);
		this.playSound("win.wav");
	}

	onFailAniRepeat(e){
		let aniImg=null;
		if(e==null){
			aniImg = this.FindIChildByName("ani_fail");
		}else{
			aniImg = soui4.toIWindow(e.Sender());
		}
		let rc = aniImg.GetIParent().GetClientRect();
		let szImg = aniImg.GetDesiredSize(-1,-1);
		let x = rc.left+ Math.round(Math.random()*(rc.Width()-szImg.cx));
		let y = rc.top+ Math.round(Math.random()*(rc.Height()-szImg.cy));
		aniImg.Move2(x,y,szImg.cx,szImg.cy);
		this.playSound("lose.wav");
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

	buildMines(mines){
		let head="<t:g.mine1>";
		let tail="</t:g.mine1>";
		let xml="";
		
		for(let i=0;i<mines;i++){
			let ele = "<data id=\""+ (base_id+i) +"\"/>";
			xml += head+ele+tail;
		}
		return xml;
	}

	onAniStartStart(ani){
		let aniFrame = this.FindIChildByName("wnd_effect");
		aniFrame.CreateChildrenFromXml(this.buildMines(this.board.mines));
		let mine=aniFrame.FindIChildByID(base_id);
		let szMine = mine.GetDesiredSize();
		let rc = aniFrame.GetClientRect();
		rc.left += rc.Width()/2-szMine.cx/2;
		rc.top += rc.Height()/2-szMine.cy/2;
		rc.right = rc.left +szMine.cx;
		rc.bottom = rc.top + szMine.cy;

		for(let i=0;i<this.board.mines;i++){
			let mine=aniFrame.FindIChildByID(base_id+i);
			mine.Move(rc);
		}
	}

	onAniStartUpdate(ani){
		let fraction = ani.GetFraction();

		let aniFrame = this.FindIChildByName("wnd_effect");
		let rc = aniFrame.GetClientRect();
		console.log("rcBoard:",rc.left,rc.top,rc.right,rc.bottom);

		let rcFrame = new soui4.CRect(rc.left,rc.top,rc.right,rc.bottom);
		
		rc.left += (rc.right-rc.left)/2;
		rc.top += (rc.bottom-rc.top)/2;

		let minePos = this.board.getMinePos();
		let mine=aniFrame.FindIChildByID(base_id);
		let szMine = mine.GetDesiredSize();
		for(let i=0;i<minePos.length;i++){
			let rcEnd = new soui4.CRect(0,0,0,0);
			rcEnd.left = rcFrame.left + szMine.cx*minePos[i].x;
			rcEnd.top = rcFrame.top +szMine.cy*minePos[i].y;
			let mine=aniFrame.FindIChildByID(base_id+i);

			let rcNew = new soui4.CRect(0,0,0,0);
			//using linear mode to calc
			rcNew.left = rc.left + (rcEnd.left-rc.left)*fraction;
			rcNew.top = rc.top + (rcEnd.top-rc.top)*fraction;
			rcNew.right = rcNew.left + szMine.cx;
			rcNew.bottom = rcNew.top + szMine.cy;			
			mine.Move(rcNew);
		}
	}

	onAniStartEnd(ani){
		let aniFrame = this.FindIChildByName("wnd_effect");
		aniFrame.SetVisible(false,true);
		aniFrame.DestroyAllChildren();
		if(this.settings.autoStart){
			//randomly find a start pos
			let startx = Math.round(Math.random()*(this.board.cols-2)+1);
			let starty = Math.round(Math.random()*(this.board.rows-2)+1);
			let dirx=[-1,1];
			let diry=[-1,1];
			let bFind = false;
			for(let xd=0;xd<2 && !bFind;xd++){
				for(let yd=0;yd<2 && !bFind;yd++){
					//console.log("find start pos,startx=",startx,"starty=",starty,"dirx=",dirx[xd],"diry=",diry[yd]);
					let pos = this.board.findStartPos(startx,starty,dirx[xd],diry[yd]);
					if(pos.x!=-1){
						bFind = true;
						if(this.board.getRoundMines(pos.x,pos.y)!=0){
							console.log("error",pos.x,pos.y,"mines=",this.board.getRoundMines(pos.x,pos.y));
						}
						this.board.setMine(pos.x,pos.y,false);
					}
				}
			} 
		}
		this.aniStart=null;
		console.log("onStartAnimation ended and do gc");
		std.gc();
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
		btnHelp.SetWindowText("求助("+(this.helpTimes - this.help_cost)+")");
		btnHelp.SetVisible(this.helpTimes>0,true);

		let wndEffect = this.FindIChildByName("wnd_effect")
		wndEffect.DestroyAllChildren();
		wndEffect.SetVisible(true,true);
		//start a new value animator
		this.aniStart = new soui4.SValueAnimator();
		this.aniStart.cbHandler = this;
		if(this.aniStart.LoadAniamtor("anim:start")){
			this.aniStart.onAnimationStart=this.onAniStartStart;
			this.aniStart.onAnimationUpdate = this.onAniStartUpdate;
			this.aniStart.onAnimationEnd = this.onAniStartEnd;
			this.aniStart.Start(this.GetIRoot().GetContainer());
		}else{
			this.onAniStartEnd(null);
		}
	}

	onBtnReset(e){
		this.onReset();
		let stack_result = this.FindIChildByName("stack_result");
		stack_result.SetVisible(false,true);
	}

	onAniGoldUpdate(ani){
		let wndEffect = this.FindIChildByName("wnd_effect");
		let fraction = ani.GetFraction();
		fraction *=3;
		let wndGold = wndEffect.GetIChild(1);

		let idx = ani.GetIValueAnimator().GetID();
		let pos = this.board.index2cord(idx);

		let rcBoard = wndEffect.GetClientRect();
		let ptCenter = rcBoard.CenterPoint();

		let mine=this.FindIChildByID(base_id);
		let szMine = mine.GetWindowRect();
		if(fraction<2){
			//do round
			fraction -= Math.floor(fraction);
			const radius = 200;
			let x = Math.round(radius*Math.cos(fraction*(Math.PI*2))+ptCenter.x);
			let y = Math.round(radius*Math.sin(fraction*(Math.PI*2))+ptCenter.y);
			let rcGold = new soui4.CRect(x,y,x,y);
			rcGold.InflateRect(szMine.Width()/2,szMine.Height()/2,szMine.Width()/2,szMine.Height()/2);
			wndGold.Move(rcGold);
		}else{
			//move to dest pos
			fraction-=2;
			let xEnd = rcBoard.left + rcBoard.Width()/this.board.cols*pos.x;
			let yEnd = rcBoard.top + rcBoard.Height()/this.board.rows*pos.y;

			let x = ptCenter.x + (xEnd-ptCenter.x)*fraction;
			let y = ptCenter.y + (yEnd-ptCenter.y)*fraction;
			let rcGold = wndGold.GetClientRect();
			rcGold.MoveToXY(x,y);
			wndGold.Move(rcGold);
		}
	}

	onAniGoldEnd(ani){
		let btnHelp=this.FindIChildByName("btn_help");
		let wndEffect = this.FindIChildByName("wnd_effect");
		wndEffect.SetVisible(false,true);
		if(ani!=null){
			let idx = ani.GetIValueAnimator().GetID();
			console.log("get animator id ",idx);
			let pos = this.board.index2cord(idx);
			this.board.setMine(pos.x,pos.y,false);
			this.help_cost++;
			btnHelp.SetWindowText("求助("+(this.helpTimes - this.help_cost)+")");		
		}
		btnHelp.EnableWindow(true);
	}

	onBtnHelp(e){
		if(this.timer!=null){
			let btnHelp = soui4.toIWindow(e.Sender());
			let pos = this.board.getSafeGrid();
			if(pos.x!=-1 && this.help_cost<this.helpTimes){
				btnHelp.EnableWindow(false);
				let wndEffect = this.FindIChildByName("wnd_effect");
				wndEffect.DestroyAllChildren();
				wndEffect.SetVisible(true,true);
				let idx = this.board.cord2index(pos.x,pos.y);			
				wndEffect.CreateChildrenFromXml('<t:g.gold><data id="'+idx+'"/></t:g.gold>');
				//start a new value animator
				this.aniGold = new soui4.SValueAnimator();
				this.aniGold.cbHandler = this;
				if(this.aniGold.LoadAniamtor("anim:gold")){
					console.log("!!!set animator id ",idx);
					this.aniGold.GetIValueAnimator().SetID(idx);
					this.aniGold.onAnimationUpdate = this.onAniGoldUpdate;
					this.aniGold.onAnimationEnd = this.onAniGoldEnd;
					this.aniGold.Start(this.GetIRoot().GetContainer());
					this.playSound("bless.wav");
				}else{
					this.onAniGoldEnd(null);
				}
			}
		}else{
			soui4.SMessageBox(this.GetHwnd(),"游戏还没有开始","提示",soui4.MB_OK);
		}
	}

	onMenuCmd(e){
		let menuCmd = soui4.toEventMenuCmd(e);
		switch(menuCmd.menuId)
		{
			case 100:{
			//show setting dialog
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
			break;
			}
			case 101:{
				//show about dialog
				let dlgAbout= new soui4.JsHostDialog("layout:dlg_about");
				dlgAbout.DoModal(this.GetHwnd());
				break;
			}
		}
	}

	init(){
		console.log("init");
		soui4.SConnect(this.FindIChildByName("btn_reset"),soui4.EVT_CMD,this,this.onBtnReset);
		soui4.SConnect(this.FindIChildByName("btn_help"),soui4.EVT_CMD,this,this.onBtnHelp);
		soui4.SConnect(this.FindIChildByName("btn_menu"),soui4.EVT_CMD,this,this.onBtnMenu);
		soui4.SConnect(this.FindIChildByName("ani_win"),soui4.EVT_IMAGE_ANI_REPEAT,this,this.onWinAniRepeat);
		soui4.SConnect(this.FindIChildByName("ani_fail"),soui4.EVT_IMAGE_ANI_REPEAT,this,this.onFailAniRepeat);
		soui4.SConnect(this.GetIRoot(),soui4.EVT_MENU_CMD,this,this.onMenuCmd);
		
		this.onInitBoard(this.settings.mode);
		this.GetIRoot().Update();
		this.CenterWindow(0);
		this.onReset();
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

			f = std.open(g_workDir+"\\record.json","w");
			let str = JSON.stringify(this.record);
			f.puts(str);
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