
const { app, BrowserWindow, dialog, ipcMain} = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs-extra');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
let isCleanupDone = false;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'icons', '/mac/icon.icns'),
    backgroundColor: "#1D1D1D",
    width: 800,
    height: 600,
    minWidth: 740,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,

      nativeWindowOpen: true

    },

  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();


  mainWindow.on('close', (e) => {
     // Prevent window from closing immediately
    if (mainWindow.title !== 'CasuaFolio Builder - Main Menu') { // only exit when in the main menu
      e.preventDefault();
      console.log('Quitting casuafolio... disabled :)')
    } else {
    // close
    console.log('Quitting casuafolio... :)')
    mainWindow.destroy()
    app.quit()
    }
  })
};



// Handling read file
ipcMain.handle('read-json', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data;
  } catch (err) {
    throw err;
  }
});

// Handling write file
ipcMain.handle('write-json', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    return true;
  } catch (err) {
    throw err;
  }
});




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== 'darwin') {
    app.quit();
  //}
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

app.disableHardwareAcceleration();





ipcMain.on('image-file-request', (event, folder_name_of_addedImage, galleryDivID_of_addedImage, isLogo) => {  
  // If the platform is 'win32' or 'Linux'
  if (process.platform !== 'darwin') {
    // Resolves to a Promise<Object>
    dialog.showOpenDialog({
      title: 'Select the File to be uploaded',
      defaultPath: path.join(__dirname, '../assets/'),
      buttonLabel: 'Upload Image',
      // Restricting the user to only Text Files.
      filters: [ 
        { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
         ],
      // Specifying the File Selector Property
      properties: ['openFile']
    }).then(file => {
      // Stating whether dialog operation was
      // cancelled or not.
      console.log(file.canceled);
      if (!file.canceled) {
        const filepath = file.filePaths[0].toString();
        console.log(filepath);
        console.log("file path of image 1, at index.js")
        event.reply('image-file-received', filepath, folder_name_of_addedImage, galleryDivID_of_addedImage, isLogo);
      }  
    }).catch(err => {
      console.log(err)
    });
  }
  else {
    // If the platform is 'darwin' (macOS)
    dialog.showOpenDialog({
      title: 'Select the File to be uploaded',
      defaultPath: path.join(__dirname, '../assets/'),
      buttonLabel: 'Upload Image',
      filters: [ 
        { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
         ],
      // Specifying the File Selector and Directory 
      // Selector Property In macOS
      properties: ['openFile', 'openDirectory']
    }).then(file => {
      console.log(file.canceled);
      if (!file.canceled) {
      const filepath = file.filePaths[0].toString();
      console.log(filepath);
      console.log("file path of image 2, at index.js")
      event.reply('image-file-received', filepath, folder_name_of_addedImage, galleryDivID_of_addedImage, isLogo);
    }  
  }).catch(err => {
      console.log(err)
    });
  }
});



ipcMain.on('pdf-file-request', (event, folderName, divId_of_cv_container) => {
  const dialogOptions = {
    title: 'Select the File to be uploaded',
    defaultPath: path.join(__dirname, '../assets/'),
    buttonLabel: 'Upload File',
    filters: [
      { name: 'PDFs', extensions: ['pdf'] }
    ],
    properties: ['openFile']
  };

  if (process.platform === 'darwin') {
    dialogOptions.properties.push('openDirectory');
  }

  dialog.showOpenDialog(dialogOptions).then(file => {
    if (!file.canceled) {
      const filepath = file.filePaths[0].toString();
      event.reply('pdf-file-received', filepath, folderName);
    }
  }).catch(err => {
    console.error(err);
  });
});

// Set the base path depending on the environment
let basePath =  path.join(__dirname, '..') // Adjust if // Corrected path for production

if (path.basename(basePath) == 'app.asar') { // when the app is Packaged
  basePath = path.join(basePath, '..', 'casuafolio-react-app');
} else {
  basePath = path.join(basePath, 'casuafolio-react-app')
}

ipcMain.on('open-save-dialog', (event) => {
  dialog.showOpenDialog({
    title: 'Select a Folder for CasuaFolio Build',
    properties: ['openDirectory'],
    buttonLabel: 'Download Here'
  }).then(result => {
    if (result.canceled) {
      console.log('User canceled the save operation.');
      event.reply('open-save-dialog-failed', true)

      return;
    }

    const savePath = result.filePaths[0];
    console.log(`Saving to: ${savePath}`);

    const reactAppPath = basePath;
    let command = 'npm install';

    exec(command, { cwd: reactAppPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        event.reply('open-save-dialog-failed', false, reactAppPath)
        return;
      } else {

        command = 'npm run build';

        exec(command, { cwd: reactAppPath }, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            event.reply('open-save-dialog-failed', false, reactAppPath)
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
    
          const buildDirectoryPath = `${reactAppPath}/build`;
          const targetPath = path.join(savePath, 'CasuaFolio_build'); // create a folder called 'CasuaFolio_build'
          
          fs.copy(buildDirectoryPath, targetPath, err => {
            if (err) {
              console.error('Error copying the build directory:', err);
              event.reply('open-save-dialog-failed')
            } else {
              console.log('Build directory successfully copied to:', targetPath);
              event.reply('open-save-dialog-completed', targetPath)
            }
          });
        });

        
      }

    });


  }).catch(err => {
    console.error('Error showing save dialog:', err);
    event.reply('open-save-dialog-failed')

  });
  
});





ipcMain.on('quit-application', (event) => {
  app.quit();
});