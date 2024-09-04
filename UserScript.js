// ==UserScript==
// @name         PT站点魔力计算器 (fork)
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。基于 neoblackxt, LaneLau 版本。
// @author       ptninja
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// @match        *://kp.m-team.cc/*
// @match        *://*.hddolby.com/torrents*
// @match        *://*.leaguehd.com/torrents*
// @match        *://*.hdhome.org/torrents*
// @match        *://*.hdsky.me/torrents*
// @match        *://*.ourbits.club/torrents*
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
// @match        *://hdmayi.com/torrents*
// @match        *://pt.msg.vg/torrents*
// @match        *://*.hdarea.club/torrents*
// @match        *://*.azusa.wiki/torrents*
// @match        *://*.carpt.net/torrents*
// @match        *://*.hhanclub.top/torrents*
// @match        *://wiki.hhanclub.top/*%E6%86%A8%E8%B1%86%E4%B8%8E%E5%81%9A%E7%A7%8D%E7%A7%AF%E5%88%86
// @match        *://*/mybonus.php*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/* globals echarts */

/*
 * 2024-09-03
 *   - Enhanced HHClub support
 *      - Add chart for official torrent
 *      - Mark as beta release
 * 2024-09-02
 *   - Add Audiences support.
 *      - Regular params are parsed for non-official torrents.
 *      - Additional params are parsed as official torrents.
 *
 */

const HHCLUB_OFFICIAL_TORRENT_B_SCALER = 4;
const HHCLUB_PARAM_FLIE_NAME = encodeURIComponent('憨豆与做种积分');

const Sites = Object.freeze({
    HHCLUB: 'hhanclub',
    MTEAM: 'm-team',
    AUDIENCES: 'audiences',
    HARES: 'hares',
    AZUSA: 'azusa',
});

function isSite(host, name) {
    return host.includes(name);
}

function calculateAfromB(B, B0, L) {
    return L * Math.tan(B * Math.PI / (2 * B0));
}

function calcA(T, S, N, T0, N0) {
    var c1 = 1 - Math.pow(10, -(T / T0));
    // 当断种时，显示续种后的实际值，因为当前状态值无意义
    N = N ? N : 1;
    // 当前状态值，加入做种后实际值会小于当前值
    // TODO: 改为双行显示为当前值和实际值
    var c2 = 1 + Math.pow(2, .5) * Math.pow(10, -(N - 1) / (N0 - 1));
    return c1 * S * c2;
}

function calcB(A, B0, L) {
    let host = getHost();
    if (isSite(host, Sites.HHCLUB)) {
        return B0 * (2 / Math.PI) * Math.atan(A / L - 5) + 20;
    } else {
        return B0 * (2 / Math.PI) * Math.atan(A / L);
    }
}

function makeAHtmlElement($this, i_T, i_S, i_N, T0, N0) {
    const millisecondsInAWeek = 7 * 24 * 60 * 60 * 1000;
    let host = getHost();

    var timeElapsed, size, seeders;
    if (isSite(host, Sites.HHCLUB)) {
        timeElapsed = $this.find('.torrent-info-text.torrent-info-text-added > span').attr('title');
        size = $this.find('.torrent-info-text.torrent-info-text-size').text().trim();
        seeders = $this.find('.torrent-info-text.torrent-info-text-seeders').text().trim();
    } else {
        timeElapsed = $this.children('td:eq(' + i_T + ')').find("span").attr("title");
        size = $this.children('td:eq(' + i_S + ')').text().trim();
        seeders = $this.children('td:eq(' + i_N + ')').text().trim();
    }

    var T = (new Date().getTime() - new Date(timeElapsed).getTime()) / millisecondsInAWeek;
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
    var N = parseInt(seeders);
    var A = calcA(T, S, N, T0, N0).toFixed(2);
    var ave = (A / S).toFixed(2);
    if ((A > S * 2) && (N != 0)) {
        //标红A大于体积2倍且不断种的种子
        return '<span style="color:#ff0000;font-weight:900;">' + A + '@' + ave + '</span>'
    } else {
        return '<span style="">' + A + '@' + ave + "</span>"
    }
}

function getHost() {
    return window.location.host.match(/\b[^.]+\.[^.]+$/)[0];
}

// TODO: create dict to return host => config
function getSiteSettings() {
    let host = getHost();
    let myBonusPageUrl = isSite(host, Sites.MTEAM) ? "mybonus" : "mybonus.php";
    let isMybonusPage = window.location.toString().includes(myBonusPageUrl);
    let isTorrentPage = window.location.toString().includes("torrents.php");
    let isHHParamPage = window.location.toString().includes(HHCLUB_PARAM_FLIE_NAME);

    const PAGE_DELAY = 3000;
    var timeout = 0;
    if (isMybonusPage && isSite(host, Sites.MTEAM)) {
        timeout = PAGE_DELAY;
    } else if (isHHParamPage) {
        timeout = PAGE_DELAY;
    }

    return {
        host: host,
        isMybonusPage: isMybonusPage,
        isTorrentPage: isTorrentPage,
        isHHParamPage: isHHParamPage,
        timeout: timeout,
    }
}

function readParams() {
    const {host, isMybonusPage} = getSiteSettings();
    
    let argsReady = true;
    let T0 = GM_getValue(host + ".T0");
    let N0 = GM_getValue(host + ".N0");
    let B0 = GM_getValue(host + ".B0");
    let L = GM_getValue(host + ".L");
    let B0_official = GM_getValue(host + ".B0_official");
    
    if (!(T0 && N0 && B0 && L)) {
        argsReady = false;
        if (!isMybonusPage) {
            console.log("未找到魔力值参数,请打开魔力值页面获取（/mybonus.php）。HHClub 需要去 wiki");
        }
    }
    
    return {
        argsReady: argsReady,
        T0: T0,
        N0: N0,
        B0: B0,
        L: L,
        B0_official: B0_official,
    }
}

function parseParams(host) {
    const bElement = isSite(host, Sites.HHCLUB) ? 'kbd' : 'b';
    const B0_split_delim = isSite(host, Sites.AUDIENCES) ? /[, ]+/ : ' = ';
    
    const T0 = parseInt($(`li:has(${bElement}:contains('T0'))`).last()[0].innerText.split(" = ")[1]);
    const N0 = parseInt($(`li:has(${bElement}:contains('N0'))`).last()[0].innerText.split(" = ")[1]);
    const L = parseInt($(`li:has(${bElement}:contains('L'))`).last()[0].innerText.split(" = ")[1]);

    // For sites such as AD, HH, they use different B0 for regular and official torrents
    const B_values = $(`li:has(${bElement}:contains('B0'))`).last()[0].innerText.split(B0_split_delim);

    let B0 = null, B0_official = null;
    if (isSite(host, Sites.AUDIENCES)) {
        B0_official = parseInt(B_values[3]);
        B0 = parseInt(B_values[4]);
    } else {
        B0 = parseInt(B_values[1]);
    }
    
    GM_setValue(host + ".T0", T0);
    GM_setValue(host + ".N0", N0);
    GM_setValue(host + ".B0", B0);
    GM_setValue(host + ".L", L);

    if (B0_official !== null) {
        GM_setValue(host + ".B0_official", B0_official);
    }
    
    console.log(`Parsed: T0=${T0},N0=${N0},B0=${B0},L=${L},B0_official=${B0_official}`);
    
    return {
        T0: T0,
        N0: N0,
        B0: B0,
        L: L,
        B0_official: B0_official,
    }
}

// By default, parses only one A value
// For some sites such as AD and HH, it has different B0 and A values for regulary and official torrents
function parseA(host) {
    var A, A_official;
    if (isSite(host, Sites.AUDIENCES)) {
        let regularA_text = $("td.text > div").contents()[6].wholeText.trim().split(', ')[0];
        A = parseFloat(regularA_text.split(' = ')[1])
        let officialA_text = $("td.text > div").contents()[4].wholeText.trim().split(', ')[0];
        A_official = parseFloat(officialA_text.split(' = ')[1])
    } else {
        A = parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
    }

    if (isSite(host, Sites.HHCLUB)) {
        const A_official_text = $("#bonus-table").nextAll("div").find("div:contains('官种加成')").nextAll().eq(2).text();
        A_official = parseFloat(A_official_text.replaceAll(',', ''));
    }

    return {
        A: A,
        A_official: A_official,
    };
}

// m-team does not show A explicitly, parse B and reverse calculate A instead
function getMteamA(B0, L) {
    let numUpload = parseInt($('span.ant-typography:has(img)')[0].innerText.split(/\s+/)[1]);
    let maxUpload = Math.min(numUpload, 14);
    let B = parseFloat($("table.tablist table tr:nth-child(2) td:nth-child(3)")[0].innerText) - 0.7 * maxUpload;
    return calculateAfromB(B, B0, L);
}

function getChartOption(data, point, title='B - A 图') {
    return {
        title: {
            text: title,
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
                data: [point],
                symbolSize: 6
            }
        ]
    };
}

// TODO: support M-team A column
function appendAValue(T0, N0) {
    var i_T, i_S, i_N;
    let host = getHost();
    if (isSite(host, Sites.HHCLUB)) {
        var header = $('div.flex.m-auto:has(div.torrent-cat):not(.torrent-table-for-spider)');
        header.children().last().before(`
            <div class="torrent-manage">
            <span class="!text-[#FFFFFF] text-[16px] font-bold leading-6 hover:!text-orange-400 m-auto">A@A/GB</span>
            </div>
        `);
        header.find('.torrent-info').children().each( function (col) {
            if ($(this).find('[alt="time"]').length) {
                i_T = col;
            } else if ($(this).find('[alt="size"]').length) {
                i_S = col;
            } else if ($(this).find('[alt="seeders"]').length) {
                i_N = col;
            }
        });

        if (i_T == null || i_S == null || i_N == null) {
            alert('未能找到数据列');
            return;
        }

        $('.torrent-table-sub-info').each(function (_){
            var $this = $(this);
            var textA = makeAHtmlElement($this, i_T, i_S, i_N, T0, N0);
            $this.children(".torrent-manage").before(`
                <div class="torrent-manage">${textA}</td>
            `);
        });
        
    } else {
        $('.torrents:last-of-type>tbody>tr').each(function (row) {
            var $this = $(this);
            if (row == 0) {
                $this.children('td').each(function (col) {
                    if ($(this).find('img.time').length) {
                        i_T = col
                    } else if ($(this).find('img.size').length) {
                        i_S = col
                    } else if ($(this).find('img.seeders').length) {
                        i_N = col
                    }
                })
                if (!i_T || !i_S || !i_N) {
                    alert('未能找到数据列');
                    return
                }
                $this.children("td:last").before("<td class=\"colhead\" title=\"A值@每GB的A值\">A@A/GB</td>");
            } else {
                var textA = makeAHtmlElement($this, i_T, i_S, i_N, T0, N0)
                $this.children("td:last").before("<td class=\"rowfollow\">" + textA + "</td>");
            }
        });
    }
}


function drawSingleChart(A, B0, L, options = {}) {
    const {
        B_scaler = 1,
        title = 'B - A 图',
        id = 'main',
    } = options;

    var myChart = echarts.init(document.getElementById(`${id}`));

    let data = []
    for (let i = 0; i < 25 * L; i = i + L / 4) {
        data.push([i, B_scaler * calcB(i, B0, L)])
    }
    const point = [A, B_scaler * calcB(A, B0, L)];

    // 指定图表的配置项和数据
    var option = getChartOption(data, point, title);
    
    // 使用刚指定的配置项和数据显示图表。
    myChart.setOption(option); 
}

function drawChart(A, B0, L, A_official = null, B0_official = null) {
    let host = getHost();
    
    let container = '<div id="chart-container"></div>';
    if ($("table+h1").length) {
        // 大多数情况
        $("table+h1").before(container);
    } else if (isSite(host, Sites.AZUSA)) {
        $("table:has(td.loadbarbg)").after(container);
    } else if (isSite(host, Sites.HARES)) {
        $("div:has(div.layui-progress)").after(container);
    } else if (isSite(host, Sites.MTEAM)) {
        $("table.tablist table").before(container);
    } else if (isSite(host, Sites.HHCLUB)) {
        $("#bonus-table").closest("div").parent().after(container);
    } else {
        alert("无法找到合适的插入点");
        return 1;
    }
    
    let containerElement = $("div#chart-container");
    let chartDiv = '<div id="main" style="width: 600px;height:400px; margin:auto;"></div>';
    containerElement.append(chartDiv);
    drawSingleChart(A, B0, L);

    if (isSite(host, Sites.AUDIENCES)) {
        let secondDiv = '<div id="second" style="width: 600px;height:400px; margin:auto;"></div>';
        containerElement.prepend(secondDiv);

        drawSingleChart(A_official, B0_official, L, {title: 'B - A 图 (官种)', id: 'second'});
    }

    if (isSite(host, Sites.HHCLUB)) {
        let secondDiv = '<div id="second" style="width: 600px;height:400px; margin:auto;"></div>';
        containerElement.prepend(secondDiv);

        // TODO: currently the scaler is hardcoded, consider parsing it in the page
        const options = {B_scaler: HHCLUB_OFFICIAL_TORRENT_B_SCALER, title: 'B - A 图 (官种)', id: 'second'};
        drawSingleChart(A_official, B0, L, options);
    }
}

function run() {
    const {host, isMybonusPage, isTorrentPage, isHHParamPage} = getSiteSettings();
    var {argsReady, T0, N0, B0, L, B0_official} = readParams();
    
    if (isMybonusPage) {
        // Try to update params. For HHClub, the params are in wiki
        if (!isSite(host, Sites.HHCLUB)) {
            ({T0, N0, B0, L, B0_official} = parseParams(host));
        }
        
        if (!argsReady) {
            if (T0 && N0 && B0 && L) {
                alert("魔力值参数已更新")
            } else {
                alert("魔力值参数获取失败")
            }
        }
        
        var A, A_official;
        if (isSite(host, Sites.MTEAM)) {
            A = getMteamA(B0, L);
        } else {
            ({A, A_official} = parseA(host));
        }
        
        console.log(`Params: T0=${T0},N0=${N0},B0=${B0},L=${L},A=${A},A_official=${A_official}`);
        
        // Draw the chart
        drawChart(A, B0, L, A_official, B0_official);
    } else if (isHHParamPage) {
        parseParams(host);
    } else if (isTorrentPage) {
        // torrents page - create new column to display A@A/GB value
        appendAValue(T0, N0);
    }
}

window.onload = function () {
    const {timeout} = getSiteSettings();
    
    // for certain sites, such as Mteam, wait until ajax loads to read the param
    setTimeout(function () {
        run();
    }, timeout); // Adjust the delay (in milliseconds) as needed
}