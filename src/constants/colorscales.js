// Available colorscales for plots.
// The names and color stops are Plotly's (3.3.0), so saved settings and the
// look of every plot carried over unchanged when the plots moved to ECharts.

export const colorscales = [
    // Custom
    'Zygo',

    // Perceptually Uniform Sequential
    'Viridis',
    'Cividis',

    // Sequential - Single Hue
    'Blues',
    'Greens',
    'Greys',
    'Reds',
    'YlGnBu',
    'YlOrRd',

    // Sequential - Multi Hue
    'Bluered',
    'Jet',
    'Hot',
    'Blackbody',
    'Earth',
    'Electric',
    'Portland',
    'Rainbow',

    // Diverging
    'RdBu',
    'Picnic'
];

// Zygo colorscale: interferogram-style gradient (blue → green → yellow → red)
// Blue occupies 0.00–0.25 (~25% of range); remaining stops compressed into 0.25–1.00
const ZYGO_COLORSCALE = [
    [0.000, '#0000ff'],
    [0.125, '#0003fc'],
    [0.200, '#003ac5'],
    [0.299, '#007887'],
    [0.348, '#00cb34'],
    [0.397, '#00ea15'],
    [0.446, '#00f906'],
    [0.495, '#7aff00'],
    [0.544, '#cdff00'],
    [0.593, '#fff500'],
    [0.642, '#ffcc00'],
    [0.691, '#ff8100'],
    [0.720, '#ff6600'],
    [0.750, '#ff4300'],
    [0.799, '#ff3500'],
    [0.848, '#ff0400'],
    [0.897, '#ff1f1f'],
    [0.949, '#ff5d5d'],
    [1.000, '#ff6565']
];

// Plotly's built-in colorscales, as [position, color] stops.
const PLOTLY_COLORSCALES = {
    Viridis: [[0, '#440154'], [0.0627, '#48186a'], [0.1255, '#472d7b'], [0.1882, '#424086'], [0.2510, '#3b528b'], [0.3137, '#33638d'], [0.3765, '#2c728e'], [0.4392, '#26828e'], [0.5020, '#21918c'], [0.5647, '#1fa088'], [0.6275, '#28ae80'], [0.6902, '#3fbc73'], [0.7529, '#5ec962'], [0.8157, '#84d44b'], [0.8784, '#addc30'], [0.9412, '#d8e219'], [1, '#fde725']],
    Cividis: [[0, 'rgb(0,32,76)'], [0.058824, 'rgb(0,42,102)'], [0.117647, 'rgb(0,52,110)'], [0.176471, 'rgb(39,63,108)'], [0.235294, 'rgb(60,74,107)'], [0.294118, 'rgb(76,85,107)'], [0.352941, 'rgb(91,95,109)'], [0.411765, 'rgb(104,106,112)'], [0.470588, 'rgb(117,117,117)'], [0.529412, 'rgb(131,129,120)'], [0.588235, 'rgb(146,140,120)'], [0.647059, 'rgb(161,152,118)'], [0.705882, 'rgb(176,165,114)'], [0.764706, 'rgb(192,177,109)'], [0.823529, 'rgb(209,191,102)'], [0.882353, 'rgb(225,204,92)'], [0.941176, 'rgb(243,219,79)'], [1, 'rgb(255,233,69)']],
    Blues: [[0, 'rgb(5,10,172)'], [0.35, 'rgb(40,60,190)'], [0.5, 'rgb(70,100,245)'], [0.6, 'rgb(90,120,245)'], [0.7, 'rgb(106,137,247)'], [1, 'rgb(220,220,220)']],
    Greens: [[0, 'rgb(0,68,27)'], [0.125, 'rgb(0,109,44)'], [0.25, 'rgb(35,139,69)'], [0.375, 'rgb(65,171,93)'], [0.5, 'rgb(116,196,118)'], [0.625, 'rgb(161,217,155)'], [0.75, 'rgb(199,233,192)'], [0.875, 'rgb(229,245,224)'], [1, 'rgb(247,252,245)']],
    Greys: [[0, 'rgb(0,0,0)'], [1, 'rgb(255,255,255)']],
    Reds: [[0, 'rgb(220,220,220)'], [0.2, 'rgb(245,195,157)'], [0.4, 'rgb(245,160,105)'], [1, 'rgb(178,10,28)']],
    YlGnBu: [[0, 'rgb(8,29,88)'], [0.125, 'rgb(37,52,148)'], [0.25, 'rgb(34,94,168)'], [0.375, 'rgb(29,145,192)'], [0.5, 'rgb(65,182,196)'], [0.625, 'rgb(127,205,187)'], [0.75, 'rgb(199,233,180)'], [0.875, 'rgb(237,248,217)'], [1, 'rgb(255,255,217)']],
    YlOrRd: [[0, 'rgb(128,0,38)'], [0.125, 'rgb(189,0,38)'], [0.25, 'rgb(227,26,28)'], [0.375, 'rgb(252,78,42)'], [0.5, 'rgb(253,141,60)'], [0.625, 'rgb(254,178,76)'], [0.75, 'rgb(254,217,118)'], [0.875, 'rgb(255,237,160)'], [1, 'rgb(255,255,204)']],
    Bluered: [[0, 'rgb(0,0,255)'], [1, 'rgb(255,0,0)']],
    Jet: [[0, 'rgb(0,0,131)'], [0.125, 'rgb(0,60,170)'], [0.375, 'rgb(5,255,255)'], [0.625, 'rgb(255,255,0)'], [0.875, 'rgb(250,0,0)'], [1, 'rgb(128,0,0)']],
    Hot: [[0, 'rgb(0,0,0)'], [0.3, 'rgb(230,0,0)'], [0.6, 'rgb(255,210,0)'], [1, 'rgb(255,255,255)']],
    Blackbody: [[0, 'rgb(0,0,0)'], [0.2, 'rgb(230,0,0)'], [0.4, 'rgb(230,210,0)'], [0.7, 'rgb(255,255,255)'], [1, 'rgb(160,200,255)']],
    Earth: [[0, 'rgb(0,0,130)'], [0.1, 'rgb(0,180,180)'], [0.2, 'rgb(40,210,40)'], [0.4, 'rgb(230,230,50)'], [0.6, 'rgb(120,70,20)'], [1, 'rgb(255,255,255)']],
    Electric: [[0, 'rgb(0,0,0)'], [0.15, 'rgb(30,0,100)'], [0.4, 'rgb(120,0,100)'], [0.6, 'rgb(160,90,0)'], [0.8, 'rgb(230,200,0)'], [1, 'rgb(255,250,220)']],
    Portland: [[0, 'rgb(12,51,131)'], [0.25, 'rgb(10,136,186)'], [0.5, 'rgb(242,211,56)'], [0.75, 'rgb(242,143,56)'], [1, 'rgb(217,30,30)']],
    Rainbow: [[0, 'rgb(150,0,90)'], [0.125, 'rgb(0,0,200)'], [0.25, 'rgb(0,25,255)'], [0.375, 'rgb(0,152,255)'], [0.5, 'rgb(44,255,150)'], [0.625, 'rgb(151,255,0)'], [0.75, 'rgb(255,234,0)'], [0.875, 'rgb(255,111,0)'], [1, 'rgb(255,0,0)']],
    RdBu: [[0, 'rgb(5,10,172)'], [0.35, 'rgb(106,137,247)'], [0.5, 'rgb(190,190,190)'], [0.6, 'rgb(220,170,132)'], [0.7, 'rgb(230,145,90)'], [1, 'rgb(178,10,28)']],
    Picnic: [[0, 'rgb(0,0,255)'], [0.1, 'rgb(51,153,255)'], [0.2, 'rgb(102,204,255)'], [0.3, 'rgb(153,204,255)'], [0.4, 'rgb(204,204,255)'], [0.5, 'rgb(255,255,255)'], [0.6, 'rgb(255,204,255)'], [0.7, 'rgb(255,153,255)'], [0.8, 'rgb(255,102,204)'], [0.9, 'rgb(255,102,102)'], [1, 'rgb(255,0,0)']]
};

const parseColor = (color) => {
    if (color.startsWith('#')) {
        return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    }
    return color.slice(color.indexOf('(') + 1, color.indexOf(')')).split(',').map(Number);
};

const toHex = (rgb) => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Resolve a colorscale name to evenly spaced colors for an ECharts visualMap.
 * ECharts spaces the colors of `inRange.color` evenly, so stops at uneven
 * positions (Zygo's wide blue band, Jet's ends) are resampled to keep the
 * gradient where Plotly put it.
 * @param {string} name - colorscale name from the colorscales list
 * @param {number} count - number of colors to sample
 * @returns {string[]} - hex colors from the low end to the high end
 */
export const colorscaleColors = (name, count = 64) => {
    const stops = (name === 'Zygo' ? ZYGO_COLORSCALE : PLOTLY_COLORSCALES[name] || PLOTLY_COLORSCALES.Jet)
        .map(([pos, color]) => [pos, parseColor(color)]);
    const colors = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        let k = 1;
        while (k < stops.length - 1 && stops[k][0] < t) k++;
        const [p0, c0] = stops[k - 1];
        const [p1, c1] = stops[k];
        const f = p1 > p0 ? Math.min(Math.max((t - p0) / (p1 - p0), 0), 1) : 0;
        colors.push(toHex(c0.map((v, j) => v + (c1[j] - v) * f)));
    }
    return colors;
};
