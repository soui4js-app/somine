import * as soui4 from "soui4";

var g_workDir="";

class MineBoard{
	constructor(gridx,gridy,mines){
		
	}
}

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
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
		stackApi.Release();
	}

	buildBoard(size){
		let head="<t:g.mine>";
		let tail="</t:g.mine>";
		let xml="";
		for(let i=0;i<size;i++){
			let ele = "<data id=\""+(500+i)+"\" data=\""+(1000+i)+"\"" +" text=\"" + i+"\"" +"/>";
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
			board.CreateChildrenFromXml(this.buildBoard(9*9));	
		}
		{
			let board = this.FindIChildByName("board_middle");
			board.CreateChildrenFromXml(this.buildBoard(16*16));	
		}
		{
			let board = this.FindIChildByName("board_hard");
			board.CreateChildrenFromXml(this.buildBoard(30*16));	
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