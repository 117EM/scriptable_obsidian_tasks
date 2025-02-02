const fileManager = FileManager.local()
const VAULT_NAME = 'NAME_OF_YOUR_VAULT'

const bookmark = fileManager.allFileBookmarks()
  .find(({name}) => name === "obsidian")
if (bookmark == null) {
  console.log('Failed to find Bookmark')
  return
}

const npPath = fileManager.bookmarkedPath(bookmark.name)
if (npPath == null) {
  console.log('Failed to find path of Bookmark')
  return
}

const STATUS_MAP = {
  ' ': "TODO",
  'x': "COMPLETE",
  '/': "IN PROGRESS",
  '-': "CANCELLED",
}


function getTasks(file, path) {
  const lines = file.split('\n')
  const taskLines = lines
    .filter(line => 
      line.match(/^\s*\- \[[x\- /]\] #task/) // - [ ] #task
    );
  
  const tasks = taskLines
    .map(line => line.trim())
    .filter(line => line[4] === ']')
    .map(line => {
      const status = STATUS_MAP[line[3]] ?? 'TODO';
      const propertyStrings = line
        .match(/[\u2795|\uD83D\uDEEB|\u23F3|\uD83D\uDCC5|\u274C|\u2705] \d{4}-\d{2}-\d{2}/gu) // 📅 2025-02-06 and the other date related emojis
      const prioritySymbol = line
        .match(/\u23EC|\uD83D\uDD3D|\uD83D\uDD3C|\u23EB|\uD83D\uDD3A/gu) // ⏬ 🔽 🔼 ⏫ 🔺
      const priority = prioritySymbol ? prioritySymbol : [''];
      const recuringString = line
        .match(/[\uD83D\uDD01]\s[#-~\s]+/gu) // 🔁 symbol and everything after it until the next emoji or eol
      const textWithoutProperties = propertyStrings != null 
          ? Array.from(propertyStrings)
            .reduce((result, needle) => 
              result.replace(needle, ''), line.slice(11) // cut off - [ ] #task and get rid of properties
            )
      : line.slice(11) // cut off - [ ] #task
      const textWithoutPropertiesAndRecuring = recuringString != null // remove recuring symbol and string from text
        ? Array.from(recuringString).reduce((result, needle) => 
              result.replace(needle, ''), textWithoutProperties
          )
      : textWithoutProperties;
      const text = textWithoutPropertiesAndRecuring.replace(/\u23EC|\uD83D\uDD3D|\uD83D\uDD3C|\u23EB|\uD83D\uDD3A/gu, ''); // remove priority symbols
      const propertyPairs = propertyStrings != null 
        ? Array.from(propertyStrings)
          .map(propStr => propStr.split(' '))
      : []
      const recuringPair = recuringString != null 
        ? [recuringString[0].split(' ')[0], recuringString[0].split(' ').slice(1).join(' ')]
      : []
      const properties = Object.fromEntries(propertyPairs)
      const recuring = recuringPair.length > 0 ? Object.fromEntries([recuringPair]) : {};
      return {
        ...properties,
        text: text.trim(),
        priority,
        ...recuring,
        status,
        complete: status === 'COMPLETE',
        file: path
      }
    })
  return tasks
}

function readAllTasks(path) {
  let tasks = []
  const paths = fileManager
  	.listContents(path)
    .filter(c => !c.startsWith("."))
    .map(subPath => `${path}/${subPath}`)
  
  for (const path of paths) {
    if (fileManager.isDirectory(path)) {
      tasks = tasks.concat(readAllTasks(path))
    } else if(fileManager.fileExtension(path) === 'md') {
      const contents = fileManager.readString(path)
      const tasksInFile = getTasks(contents, path)
      tasks = tasks.concat(tasksInFile)
    }
  }
  return tasks
}

const allTasks = readAllTasks(npPath)

const today = new Date()
const todayStr = [
  today.getFullYear(),
  today.getMonth() + 1,
  today.getDate()
].join('-')

const PRIORITY = {
  '\uD83D\uDD3A': 0, // 🔺
  '\u23EB': 1,       // ⏫ 
  '\uD83D\uDD3C': 2, // 🔼
  ' ': 3,
  '\uD83D\uDD3D': 4, // 🔽
  '\u23EC': 5,       // ⏬ 
}

const dueTasks = allTasks
  .filter(task => !task.complete && task['📅'] != null && task['📅'] <= todayStr)
  .toSorted((a, b) => a['📅'].localeCompare(b['📅']))
  .toSorted((a, b) => {
    const x = PRIORITY[a.priority] ?? 3
    const y = PRIORITY[b.priority] ?? 3
    return x - y
})

const BG_COLOR =
  Color.dynamic(new Color("#fefefe"), new Color("#2c2c2c"))
const P_COLOR =
  Color.dynamic(new Color("#000000"), new Color("#ffffff"))
const S_COLOR =
  Color.dynamic(new Color("#444444"), new Color("#aaaaaa"))

let widget = await createWidget()
if (config.runsInWidget) {
  Script.setWidget(widget)
  Script.complete()
} else {
  await widget.presentLarge()
}

async function createWidget() {
  let widget = new ListWidget()
  widget.spacing = 8
	
  const titleStack = widget.addStack()
  titleStack.layoutHorizontally()
  const title = titleStack.addText("Due Today")
  title.font = Font.boldSystemFont(24)
  title.textColor = P_COLOR
  titleStack.addSpacer()
  const meta = titleStack.addText(`${dueTasks.length}`)
  meta.font = Font.regularSystemFont(24)
  meta.textColor = S_COLOR
  titleStack.url = "obsidian://nldates?day=today"
  // titleStack.setPadding(0, 0, 8, 0)
  
  const checkbox = SFSymbol.named('circle')
  checkbox.applyFont(Font.lightSystemFont(16))
	const checkboxImg = checkbox.image
  
  dueTasks.slice(0, 5).forEach((task) => {
    const filePath = task.file.split(VAULT_NAME + '/')[1].slice(0, -3)
    const vaultArg = encodeURIComponent(VAULT_NAME)
    const filePathArg = encodeURIComponent(filePath)
    
    const row = widget.addStack()
    row.layoutHorizontally()
    row.spacing = 8
    const rowImg = row.addImage(checkboxImg)
    rowImg.tintColor = Color.blue()
    rowImg.imageSize = new Size(32, 32)
    const taskText = row.addText(task.text)
    taskText.font = Font.regularSystemFont(16)
    taskText.lineLimit = 3
    taskText.textColor = P_COLOR
    
    row.url = `obsidian://open?vault=${vaultArg}&file=${filePathArg}`
  })
  
  widget.addSpacer()

  return widget
}
