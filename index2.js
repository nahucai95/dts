const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true }); // Cambiar a true para modo headless
  const page = await browser.newPage();

  // Establecer el encabezado Referer para hacer creer al sitio que estás navegando desde https://tvhd.pe/
  await page.setExtraHTTPHeaders({
    'Referer': 'https://tvhd.pe/'
  });

  await page.goto('https://betzta.com/canales.php?stream=dsar');

  // Esperar a que todos los scripts estén cargados
  await page.waitForSelector('script');

  // Obtener el contenido de todos los scripts
  const scriptContent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(script => script.textContent);
  });

  // Buscar la URL dentro del contenido del script
  let url;
  scriptContent.forEach(content => {
    const regex = /source:\s*"(.*?)"/;
    const match = content.match(regex);
    if (match && match[1]) {
      url = match[1];
    }
  });

  // Escribir la URL encontrada en resultados.html
  fs.writeFileSync('resultado.html', `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados</title>
  </head>
  <body>
    <div id="resultado">${url}</div>
  </body>
  </html>`);

  // Cerrar el navegador
  await browser.close();
})();
