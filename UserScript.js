// ==UserScript==
// @name         PT站点魔力计算器
// @namespace    https://github.com/neoblackxt/PTMyBonusCalc
// @version      2.0.2
// @description  在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。
// @author       neoblackxt, LaneLau
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// @match        *://*.beitai.pt/torrents*
// @match        *://*.pttime.org/torrents*
// @match        *://*.ptsbao.club/torrents*
// @match        *://*.pthome.net/torrents*
// @match        *://kp.m-team.cc/*
// @match        *://zp.m-team.io/*
// @match        *://*.hddolby.com/torrents*
// @match        *://*.leaguehd.com/torrents*
// @match        *://*.hdhome.org/torrents*
// @match        *://*.hdsky.me/torrents*
// @match        *://*.ourbits.club/torrents*
// @match        *://*.u2.dmhy.org/torrents*
// @match        *://*.hdzone.me/torrents*
// @match        *://*.hdatmos.club/torrents*
// @match        *://*.pt.soulvoice.club/torrents*
// @match        *://*.pt.soulvoice.club/live*
// @match        *://*.discfan.net/torrents*
// @match        *://*.hdtime.org/torrents*
// @match        *://*.nicept.net/torrents*
// @match        *://*.pterclub.com/torrents*
// @match        *://*.hdarea.co/torrents*
// @match        *://*.hdfans.org/torrents*
// @match        *://pt.btschool.club/torrents*
// @match        *://*.1ptba.com/torrents*
// @match        *://www.oshen.win/torrents*
// @match        *://*/mybonus*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.onurlchange
// ==/UserScript==

function run() {
    var $ = jQuery;


    let argsReady = true;
    let T0 = GM_getValue(host + ".T0");
    let N0 = GM_getValue(host + ".N0");
    let B0 = GM_getValue(host + ".B0");
    let L = GM_getValue(host + ".L");
    if(!(T0 && N0 && B0 &&L)){
        argsReady = false
        if(!isMybonusPage){
            alert("未找到魔力值参数,请打开魔力值系统说明获取（/mybonus）");
        }
    }
    if (isMybonusPage){
        T0 = parseInt($("li:has(b:contains('T0'))")[1].innerText.split(" = ")[1]);
        N0 = parseInt($("li:has(b:contains('N0'))")[1].innerText.split(" = ")[1]);
        B0 = parseInt($("li:has(b:contains('B0'))")[1].innerText.split(" = ")[1]);
        L = parseInt($("li:has(b:contains('L'))")[1].innerText.split(" = ")[1]);

        GM_setValue(host + ".T0",T0);
        GM_setValue(host + ".N0",N0);
        GM_setValue(host + ".B0",B0);
        GM_setValue(host + ".L",L);

        let A = isMTeam?0:parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
        debugger


        let B = isMTeam?parseFloat($("td:contains('基本獎勵')+td+td")[0].innerText):0
        // FIXME: B的上限是B0,怎么可能出现B>=B0的情况
        B = B>=B0?B0*0.98:B

        if(!argsReady){
            if(T0 && N0 && B0 && L){
                alert("魔力值参数已更新")
            }else{
                alert("魔力值参数获取失败")
            }
        }

        function calcB(A){
            return B0*(2/Math.PI)*Math.atan(A/L)
        }

        function calcAbyB(B){
            //从B值反推A值
            return Math.tan(B/B0/(2/Math.PI))*L
        }

        let spot = isMTeam?[calcAbyB(B),B]:[A,calcB(A)]

        let data = []
        for (let i=0; i<25*L; i=i+L/4){
            data.push([i,calcB(i)])
        }

        let insertPos = isMTeam?$("ul+table"):$("table+h1")
        insertPos.before('<div id="main" style="width: 600px;height:400px; margin:auto;"></div>')

        var myChart = echarts.init(document.getElementById('main'));
        // 指定图表的配置项和数据
        var option = {
            title: {
                text: 'B - A 图',
                top: 'bottom',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                position: function (pos, params, el, elRect, size) {
                    var obj = { top: 10 };
                    obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                    return obj;
                },
                extraCssText: 'width: 170px'

            },
            xAxis: {
                name: 'A',
            },
            yAxis: {
                name: 'B'
            },
            axisPointer: {
                label: {
                    backgroundColor: '#777'
                }
            },
            series: [
                {
                    type: 'line',
                    data: data,
                    symbol: 'none'
                },
                {
                    type: 'line',
                    data:[spot],
                    symbolSize: 6
                }
            ]
        };

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
    }



    function calcA(T, S, N) {
        var c1 = 1 - Math.pow(10, -(T / T0));
        // 当断种时，显示续种后的实际值，因为当前状态值无意义
        N = N ? N : 1;
        // 当前状态值，加入做种后实际值会小于当前值
        // TODO: 改为双行显示为当前值和实际值
        var c2 = 1 + Math.pow(2, .5) * Math.pow(10, -(N - 1) / (N0 - 1));
        return c1 * S * c2;
    }

    function makeA($this, i_T, i_S, i_N) {
        var time = $this.children('td:eq(' + i_T + ')').find("span").attr("title");
        var T = (new Date().getTime() - new Date(time).getTime()) / 1e3 / 86400 / 7;
        var size = $this.children('td:eq(' + i_S + ')').text().trim();
        var size_tp = 1;
        var S = size.replace(/[KMGT]B/, function (tp) {
            if (tp == "KB") {
                size_tp = 1 / 1024 / 1024;
            } else if (tp == "MB") {
                size_tp = 1 / 1024;
            } else if (tp == "GB") {
                size_tp = 1;
            } else if (tp == "TB") {
                size_tp = 1024;
            }
            return "";
        });
        S = parseFloat(S) * size_tp;
        var number = $this.children('td:eq(' + i_N + ')').text().trim();
        var N = parseInt(number);
        var A = calcA(T, S, N).toFixed(2);
        var ave = (A / S).toFixed(2);
        if ((A > S * 2) && (N != 0)) {
            //标红A大于体积2倍且不断种的种子
            return '<span style="color:#ff0000;font-weight:900;">' + A + '@' + ave + '</span>'
        } else {
            return '<span style="">' + A + '@' + ave + "</span>"
        }
    }



    function addDataColGeneral(){
        var i_T, i_S, i_N
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            if (row == 0) {
                $this.children('td').each(function (col) {
                    debugger;

                    if ($(this).find('img.time').length) {
                        i_T = col
                    } else if ($(this).find('img.size').length) {
                        i_S = col
                    } else if ($(this).find('img.seeders').length) {
                        i_N = col
                    }
                })
                if (!i_T || !i_S || !i_N) {
                    alert('未能找到数据列')
                    return
                }
                $this.children("td:last").before("<td class=\"colhead\" title=\"A值@每GB的A值\">A@A/GB</td>");
            } else {
                var textA = makeA($this, i_T, i_S, i_N)
                $this.children("td:last").before("<td class=\"rowfollow\">" + textA + "</td>");
            }
        })
    }

    function addDataColMTeam(){
        let i_T, i_S, i_N,addFlag=false
        debugger;

        let colLen = $('div.mt-4>table>thead>tr>th').length
        if ($('div.mt-4>table>thead>tr>th:last').text().indexOf('A@A/GB')!=-1){
            addFlag = true
            colLen-=1
        }
        i_T = colLen - 4
        i_S = colLen - 3
        i_N = colLen - 2
        if (!addFlag){
            $('div.mt-4>table>thead>tr>th:last').after("<th class=\"border border-solid border-black p-2\" style=\"width: 100px;\" title=\"A值@每GB的A值\"> <div class=\"flex items-center cursor-pointer\"> <div class=\"flex-grow\">A@A/GB</div> </div> </th>");
        }
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            var textA = makeA($this, i_T, i_S, i_N)
            let tdTextA = "<td class=\"border border-solid border-black p-2 \" align=\"center\">"+textA+"</td>"
            if(addFlag){$this.children("td:last").html(textA)}
            else{
                $this.children("td:last").after(tdTextA)
                //<span class=\"block mx-[-5px]\">"+textA+"</span>
            }
        })
    }

    if(isMTeam){
        addDataColMTeam()
    }else{
        addDataColGeneral()
    }
}


function MTteamWaitPageLoadAndRun(){
    let $ = jQuery
    let count = 0
    let tableBlured = false
    let T0Found = false
    let seedTableFound = false
    let itv = setInterval(()=>{

        if(isMybonusPage){
            T0Found = $("li:has(b:contains('T0'))")[1]

        }
        if(T0Found || seedTableFound || count >= 100){
            clearInterval(itv);
            run()
        }
        count++
    },100);

    let count2 = 0
    let itvTableBlur = setInterval(()=>{
        if($('div.ant-spin-blur')[0]||count2>=50){
            tableBlured = true
            clearInterval(itvTableBlur)
        }
        count2++
    },100)
    let count3=0
    let itvTableUnblur = setInterval(()=>{
        if(tableBlured&&!$('div.ant-spin-blur')[0]||count3>=100){
            seedTableFound = $(seedTableSelector)[1]
            if(seedTableFound||count3>=100){
                clearInterval(itvTableUnblur)}
        }
        count3++
    },100)
    }
let host = window.location.host.match(/\b[^\.]+\.[^\.]+$/)[0]
let isMTeam = window.location.toString().indexOf("m-team")!=-1
let seedTableSelector = isMTeam?'div.mt-4>table>tbody>tr':'.torrents:last-of-type>tbody>tr'
let isMybonusPage = window.location.toString().indexOf("mybonus")!=-1
if (isMTeam){
    if(isMybonusPage||window.location.toString().indexOf("browse")!=-1){
        MTteamWaitPageLoadAndRun()
    }
}else{
    run()
}

var currentUrl = window.location.href;
if (window.onurlchange === null) {
    // feature is supported
    window.addEventListener('urlchange', (info) => MTteamWaitPageLoadAndRun());
}
