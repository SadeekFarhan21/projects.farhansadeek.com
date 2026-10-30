let state = false
function toggle() {
    let body = document.getElementById('body')
    let clock = document.getElementById('clock')
    let mode = document.getElementById('bt')
    let center = document.getElementById('center')
    let second = document.getElementById('second')
    if (state) {
        body.style.backgroundColor = '#c1c1c4'
        clock.className = 'clock1'
        mode.innerText = 'Dark Theme'
        mode.style.background = '#111'
        mode.style.color = '#eee'
        center.style.backgroundColor = '#363436'
        second.style.backgroundColor = '#1f221e'
        state = false
    }
    else {
        body.style.backgroundColor = '#1c1f1c'
        clock.className = 'clock2'
        mode.innerText = 'Light Theme'
        mode.style.background = '#eee'
        mode.style.color = '#111'
        center.style.backgroundColor = '#cbc'
        second.style.backgroundColor = '#e2e1f6'
        state = true
    }
}
setInterval(() => 
{
    d = new Date()
    let htime = d.getHours()
    let mtime = d.getMinutes()
    let stime = d.getSeconds()
    let hrotation = 30 * htime + mtime / 2
    let mrotation = 6 * mtime
    let srotation = 6 * stime
    hour.style.transform = `rotate(${hrotation}deg)`
    minute.style.transform = `rotate(${mrotation}deg)`
    second.style.transform = `rotate(${srotation}deg)`
}, 1000)
