const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Abrir Chromium en modo no-headless
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

  console.log(url);

  // Escribir la URL encontrada en script.js
  fs.writeFileSync('script.js', `document.addEventListener('DOMContentLoaded', function() {
    const url = '${url}';
    document.getElementById('resultado').textContent = url;
  });`);

  // Cerrar el navegador
  await browser.close();
})();
