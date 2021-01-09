import * as p5lib from './p5.min.js'
import { DavidBauMath } from './seedrandom.js'
import { SeedStore } from './seedStore.js'

function* range(start, end) {
  let x = start
  while(x < end - 1) yield x++
}

function* pseudoRandom(seed) {
  let value = seed;

  while(true) {
    value = value * 16807 % 2147483647
    yield value;
  }
}

const sketch = new p5((p) => {
  const state = {
    loading: true
  }

  p.preload = () => {
    SeedStore.fetchSeeds()
      .then(async results => {

        const paramsString = window.location.search
        const params = new URLSearchParams(paramsString)
        const seed = params.has('seed') ? params.get('seed') : Math.random()

        const data = await results.json()
        const item = data.seeds.find(s => s.name === seed)

        const depth = item.depth ?? data.depth

        DavidBauMath.seedrandom(item.seed)

        state.walk = [[0, 0]]

        let prevX = 0
        let prevY = 0

        for (const index of range(0, depth)) {
          const dir = Math.floor(DavidBauMath.random() * 4)
          const dirMap = {
            0: [ 1,  0], // right
            1: [-1,  0], // left
            2: [ 0,  1], // up
            3: [ 0, -1]  // down
          }

          prevX = prevX + dirMap[dir][0]
          prevY = prevY + dirMap[dir][1]

          state.walk.push([prevX, prevY])
        }

        sketch.background(sketch.color(200, 200, 200))
        state.loading = false
        sketch.loop()
      })
      .catch(e => console.error(e))
  }

  p.setup = () => {
    sketch.createCanvas(
      sketch.windowWidth,
      sketch.windowHeight)
  }

  p.draw = () => {

    if(state.loading) {
      sketch.background(sketch.color(42, 42, 42))

      sketch.textSize(25)
      sketch.rectMode('CENTER')
      sketch.textAlign('CENTER', 'CENTER')

      sketch.stroke('white')
      sketch.fill('white')
      sketch.text('loading...', sketch.width / 2, sketch.height / 2)
      return
    }

    console.log('Finished Loading ...', sketch.frameCount, state.walk.length)
    //sketch.background(sketch.color(200, 200, 200))

    const idx = sketch.frameCount
    if(idx >= state.walk.length) {
      console.log('End of walk')
      sketch.noLoop()
      return
    }

    const [ x, y ] = state.walk[idx]


    // state.walk.forEach(([ x, y ]) => {

      sketch.fill('red')
      sketch.stroke('black')
      //sketch.strokeWidth(2)
      sketch.ellipse(sketch.width / 2 + x, sketch.height / 2 + y, 1,1)

    // })



    //sketch.noLoop()
  }
})
