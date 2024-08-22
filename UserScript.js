// ==UserScript==
// @name         PT站点魔力计算器 (fork)
// @namespace    http://tampermonkey.net/
// @version      2.0.1
// @description  在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。基于 neoblackxt, LaneLau 版本。
// @author       ptninja
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// @match        *://*.avgv.cc/torrents*
// @match        *://*.avgv.cc/AV*
// @match        *://*.avgv.cc/GV*
// @match        *://*.avgv.cc/LES*
// @match        *://*.avgv.cc/movie*
// @match        *://*.avgv.cc/teleplay*
// @match        *://*.beitai.pt/torrents*
// @match        *://*.pttime.org/torrents*
// @match        *://*.ptsbao.club/torrents*
// @match        *://*.pthome.net/torrents*
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
// @match        *://wiki.hhanclub.top/*%E6%86%A8%E8%B1%86%E4%B8%8E%E5%81%9A%E7%A7%8D%E7%A7%AF%E5%88%86
// @match        *://*/mybonus.php*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/* globals echarts */

const HHCLUB_PARAM_FLIE_NAME = '%E6%86%A8%E8%B1%86%E4%B8%8E%E5%81%9A%E7%A7%8D%E7%A7%AF%E5%88%86';

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
    if (host.includes('hhanclub')) {
        return B0 * (2 / Math.PI) * Math.atan(A / L - 5) + 20;
    } else {
        return B0 * (2 / Math.PI) * Math.atan(A / L);
    }
}

function makeA($this, i_T, i_S, i_N, T0, N0) {
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

function getSiteSettings() {
    let host = getHost();
    let myBonusPageUrl = host.includes('m-team') ? "mybonus" : "mybonus.php";
    let isMybonusPage = window.location.toString().includes(myBonusPageUrl);
    let isTorrentPage = window.location.toString().includes("torrents.php");
    return {
        host: host,
        isMybonusPage: isMybonusPage,
        isTorrentPage: isTorrentPage,
    }
}

function readParams() {
    const {host, isMybonusPage} = getSiteSettings();

    let argsReady = true;
    let T0 = GM_getValue(host + ".T0");
    let N0 = GM_getValue(host + ".N0");
    let B0 = GM_getValue(host + ".B0");
    let L = GM_getValue(host + ".L");

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
    }
}

function parseParams(host) {
    let bElement = host.includes('hhanclub') ? 'kbd' : 'b';

    let T0 = parseInt($(`li:has(${bElement}:contains('T0'))`).last()[0].innerText.split(" = ")[1]);
    let N0 = parseInt($(`li:has(${bElement}:contains('N0'))`).last()[0].innerText.split(" = ")[1]);
    let B0 = parseInt($(`li:has(${bElement}:contains('B0'))`).last()[0].innerText.split(" = ")[1]);
    let L = parseInt($(`li:has(${bElement}:contains('L'))`).last()[0].innerText.split(" = ")[1]);

    GM_setValue(host + ".T0", T0);
    GM_setValue(host + ".N0", N0);
    GM_setValue(host + ".B0", B0);
    GM_setValue(host + ".L", L);

    console.log(`Parsed: T0=${T0},N0=${N0},B0=${B0},L=${L}`);

    return {
        T0: T0,
        N0: N0,
        B0: B0,
        L: L,
    }
}

function parseA(host, B0, L) {
    var A = 0;
    if (!host.includes('m-team')) {
        A = parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
    } else {
        // m-team does not show A explicitly, parse B and calculate A instead
        let numUpload = parseInt($('span.ant-typography:has(img)')[0].innerText.split(/\s+/)[1]);
        let maxUpload = Math.min(numUpload, 14);
        let B = parseFloat($("table.tablist table tr:nth-child(2) td:nth-child(3)")[0].innerText) - 0.7 * maxUpload;
        A = calculateAfromB(B, B0, L);
    }
    return A;
}

function getChartOption(A, B0, L, data) {
    return {
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
                data: [[A, calcB(A, B0, L)]],
                symbolSize: 6
            }
        ]
    };
}

function appendAValue(T0, N0) {
    var i_T, i_S, i_N;
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
                alert('未能找到数据列')
                return
            }
            $this.children("td:last").before("<td class=\"colhead\" title=\"A值@每GB的A值\">A@A/GB</td>");
        } else {
            var textA = makeA($this, i_T, i_S, i_N, T0, N0)
            $this.children("td:last").before("<td class=\"rowfollow\">" + textA + "</td>");
        }
    });
}

function drawChart(A, B0, L) {
    let host = getHost();
    let data = []
    for (let i = 0; i < 25 * L; i = i + L / 4) {
        data.push([i, calcB(i, B0, L)])
    }

    let main = '<div id="main" style="width: 600px;height:400px; margin:auto;"></div>';
    if ($("table+h1").length) {
        // 大多数情况
        $("table+h1").before(main);
    } else if (host.includes('azusa')) {
        // Azusa
        $("table:has(td.loadbarbg)").after(main);
    } else if (host.includes('hares')) {
        // Hares
        $("div:has(div.layui-progress)").after(main);
    } else if (host.includes('m-team')) {
        $("table.tablist table").before(main);
    } else if (host.includes('hhanclub')) {
        $("#bonus-table").closest("div").parent().after(main);
    } else {
        alert("无法找到合适的插入点");
        return 1;
    }

    var myChart = echarts.init(document.getElementById('main'));

    // 指定图表的配置项和数据
    var option = getChartOption(A, B0, L, data);

    // 使用刚指定的配置项和数据显示图表。
    myChart.setOption(option);
}

function run() {
    const {host, isMybonusPage, isTorrentPage} = getSiteSettings();
    let isHHParamPage = window.location.toString().includes(HHCLUB_PARAM_FLIE_NAME);
    var {argsReady, T0, N0, B0, L} = readParams();

    if (isMybonusPage) {
        // Try to update params. For HHClub, the params are in wiki
        if (!host.includes('hhanclub')) {
            ({T0, N0, B0, L} = parseParams(host));
        }

        if (!argsReady) {
            if (T0 && N0 && B0 && L) {
                alert("魔力值参数已更新")
            } else {
                alert("魔力值参数获取失败")
            }
        }

        const A = parseA(host, B0, L);

        console.log(`Params: T0=${T0},N0=${N0},B0=${B0},L=${L},A=${A}`);

        // Draw the chart
        drawChart(A, B0, L);
    } else if (isHHParamPage) {
        parseParams(host);
    } else if (isTorrentPage) {
        // torrents page
        appendAValue(T0, N0);
    }
}

window.onload = function () {
    let host = window.location.host.match(/\b[^.]+\.[^.]+$/)[0];
    let delayRunHosts = ['m-team', 'hhanclub'];
    let timeout = delayRunHosts.some(element => host.includes(element)) ? 3000 : 0;

    // for certain sites, such as Mteam, wait until ajax loads to read the param
    setTimeout(function () {
        run();
    }, timeout); // Adjust the delay (in milliseconds) as needed
}