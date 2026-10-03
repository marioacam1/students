// ─── CONFIGURACIÓN SUPABASE ──────────────────────────────────────────────────
const { createClient } = supabase
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)

// ─── NAVEGACIÓN ──────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById(`view-${name}`).classList.add('active')
  event.target.classList.add('active')

  if (name === 'chart') renderChart()
  if (name === 'table') renderTable(1) // Reiniciar a página 1 al cambiar a tabla
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast')
  if (!t) {
    t = document.createElement('div')
    t.className = 'toast'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2000)
}

// ─── GRÁFICA ─────────────────────────────────────────────────────────────────
// Promedio de math/reading/writing agrupado por parental_education
async function renderParentalEducationChart() {
  const { data, error } = await db.from('students').select('parental_education, math_score, reading_score, writing_score')
  if (error) { console.error(error); return }

  // Agrupar manualmente
  const groups = {}
  data.forEach(r => {
    const key = r.parental_education
    if (!groups[key]) groups[key] = { math: [], reading: [], writing: [] }
    groups[key].math.push(r.math_score)
    groups[key].reading.push(r.reading_score)
    groups[key].writing.push(r.writing_score)
  })

  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  // Orden lógico del nivel educativo
  const order = ["some high school", "high school", "some college", "associate's degree", "bachelor's degree", "master's degree"]
  const labels = order.filter(k => groups[k])

  const ctx = document.getElementById('myChart').getContext('2d')

  // Destruir chart previo si existe
  if (window._chart) window._chart.destroy()

  window._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [
        {
          label: 'Matemáticas',
          data: labels.map(l => avg(groups[l].math)),
          backgroundColor: 'rgba(0,113,227,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Lectura',
          data: labels.map(l => avg(groups[l].reading)),
          backgroundColor: 'rgba(52,199,89,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Escritura',
          data: labels.map(l => avg(groups[l].writing)),
          backgroundColor: 'rgba(255,159,10,0.8)',
          borderRadius: 8,
        },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' }
        },
        y: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' },
          min: 50, max: 80,
          title: { display: true, text: 'Promedio', color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } }
        }
      }
    }
  })
}

// Distribución por género
async function renderGenderChart() {
  const { data, error } = await db.from('students').select('gender')
  if (error) { console.error(error); return }

  const counts = { male: 0, female: 0 }
  data.forEach(r => counts[r.gender]++)

  const ctx = document.getElementById('genderChart').getContext('2d')

  if (window._genderChart) window._genderChart.destroy()

  window._genderChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Masculino', 'Femenino'],
      datasets: [{
        data: [counts.male, counts.female],
        backgroundColor: ['rgba(0,113,227,0.8)', 'rgba(255,59,48,0.8)'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        }
      }
    }
  })
}

// Distribución por etnia
async function renderEthnicityChart() {
  const { data, error } = await db.from('students').select('ethnicity')
  if (error) { console.error(error); return }

  const counts = {}
  data.forEach(r => counts[r.ethnicity] = (counts[r.ethnicity] || 0) + 1)

  const ctx = document.getElementById('ethnicityChart').getContext('2d')

  if (window._ethnicityChart) window._ethnicityChart.destroy()

  window._ethnicityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts).map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [
          'rgba(0,113,227,0.8)',
          'rgba(52,199,89,0.8)',
          'rgba(255,159,10,0.8)',
          'rgba(255,59,48,0.8)',
          'rgba(175,82,222,0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        }
      }
    }
  })
}

// Impacto de preparación de examen
async function renderTestPrepChart() {
  const { data, error } = await db.from('students').select('test_prep, math_score, reading_score, writing_score')
  if (error) { console.error(error); return }

  const groups = { none: { math: [], reading: [], writing: [] }, completed: { math: [], reading: [], writing: [] } }
  data.forEach(r => {
    groups[r.test_prep].math.push(r.math_score)
    groups[r.test_prep].reading.push(r.reading_score)
    groups[r.test_prep].writing.push(r.writing_score)
  })

  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  const ctx = document.getElementById('testPrepChart').getContext('2d')

  if (window._testPrepChart) window._testPrepChart.destroy()

  window._testPrepChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sin Preparación', 'Con Preparación'],
      datasets: [
        {
          label: 'Matemáticas',
          data: [avg(groups.none.math), avg(groups.completed.math)],
          backgroundColor: 'rgba(0,113,227,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Lectura',
          data: [avg(groups.none.reading), avg(groups.completed.reading)],
          backgroundColor: 'rgba(52,199,89,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Escritura',
          data: [avg(groups.none.writing), avg(groups.completed.writing)],
          backgroundColor: 'rgba(255,159,10,0.8)',
          borderRadius: 8,
        },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' }
        },
        y: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' },
          min: 50, max: 80,
          title: { display: true, text: 'Promedio', color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } }
        }
      }
    }
  })
}

// Impacto del tipo de almuerzo
async function renderLunchChart() {
  const { data, error } = await db.from('students').select('lunch, math_score, reading_score, writing_score')
  if (error) { console.error(error); return }

  const groups = { standard: { math: [], reading: [], writing: [] }, 'free/reduced': { math: [], reading: [], writing: [] } }
  data.forEach(r => {
    groups[r.lunch].math.push(r.math_score)
    groups[r.lunch].reading.push(r.reading_score)
    groups[r.lunch].writing.push(r.writing_score)
  })

  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  const ctx = document.getElementById('lunchChart').getContext('2d')

  if (window._lunchChart) window._lunchChart.destroy()

  window._lunchChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Estándar', 'Gratis/Reducido'],
      datasets: [
        {
          label: 'Matemáticas',
          data: [avg(groups.standard.math), avg(groups['free/reduced'].math)],
          backgroundColor: 'rgba(0,113,227,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Lectura',
          data: [avg(groups.standard.reading), avg(groups['free/reduced'].reading)],
          backgroundColor: 'rgba(52,199,89,0.8)',
          borderRadius: 8,
        },
        {
          label: 'Escritura',
          data: [avg(groups.standard.writing), avg(groups['free/reduced'].writing)],
          backgroundColor: 'rgba(255,159,10,0.8)',
          borderRadius: 8,
        },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' }
        },
        y: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' },
          min: 50, max: 80,
          title: { display: true, text: 'Promedio', color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } }
        }
      }
    }
  })
}

// Correlación entre materias
async function renderCorrelationChart() {
  const { data, error } = await db.from('students').select('math_score, reading_score, writing_score')
  if (error) { console.error(error); return }

  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  const mathAvg = avg(data.map(r => r.math_score))
  const readingAvg = avg(data.map(r => r.reading_score))
  const writingAvg = avg(data.map(r => r.writing_score))

  const ctx = document.getElementById('correlationChart').getContext('2d')

  if (window._correlationChart) window._correlationChart.destroy()

  window._correlationChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Matemáticas', 'Lectura', 'Escritura'],
      datasets: [{
        label: 'Promedio General',
        data: [mathAvg, readingAvg, writingAvg],
        backgroundColor: 'rgba(0,113,227,0.2)',
        borderColor: 'rgba(0,113,227,1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0,113,227,1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(0,113,227,1)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: '#e5e5ea' },
          grid: { color: '#e5e5ea' },
          pointLabels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          },
          ticks: {
            color: '#86868b',
            backdropColor: 'transparent'
          },
          min: 50,
          max: 80
        }
      }
    }
  })
}

// Tasa de aprobación por género
async function renderPassRateChart() {
  const { data, error } = await db.from('students').select('gender, pass_math')
  if (error) { console.error(error); return }

  const counts = { male: { total: 0, pass: 0 }, female: { total: 0, pass: 0 } }
  data.forEach(r => {
    counts[r.gender].total++
    if (r.pass_math === 1) counts[r.gender].pass++
  })

  const maleRate = Math.round((counts.male.pass / counts.male.total) * 100)
  const femaleRate = Math.round((counts.female.pass / counts.female.total) * 100)

  const ctx = document.getElementById('passRateChart').getContext('2d')

  if (window._passRateChart) window._passRateChart.destroy()

  window._passRateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Masculino', 'Femenino'],
      datasets: [{
        label: 'Tasa de Aprobación %',
        data: [maleRate, femaleRate],
        backgroundColor: ['rgba(0,113,227,0.8)', 'rgba(255,59,48,0.8)'],
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#1d1d1f',
            font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' }
        },
        y: {
          ticks: { color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } },
          grid: { color: '#e5e5ea' },
          min: 0, max: 100,
          title: { display: true, text: 'Porcentaje', color: '#86868b', font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' } }
        }
      }
    }
  })
}

// Función principal para renderizar todos los gráficos
async function renderChart() {
  await Promise.all([
    renderParentalEducationChart(),
    renderGenderChart(),
    renderEthnicityChart(),
    renderTestPrepChart(),
    renderLunchChart(),
    renderCorrelationChart(),
    renderPassRateChart()
  ])
}

// ─── TABLA ───────────────────────────────────────────────────────────────────
const EDITABLE_COLS = ['math_score', 'reading_score', 'writing_score']
const PAGE_SIZE = 100
let currentPage = 1
let totalPages = 1
let totalRecords = 0

async function renderTable(page = 1) {
  console.log('renderTable called with page:', page)
  currentPage = page
  const tbody = document.getElementById('table-body')
  tbody.innerHTML = '<tr><td colspan="11" class="loading">Cargando...</td></tr>'

  try {
    // Calcular el rango para la paginación
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    console.log('Fetching from', from, 'to', to)

    const { data, error, count } = await db
      .from('students')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Supabase error:', error)
      tbody.innerHTML = `<tr><td colspan="11" class="loading">Error: ${error.message} - ${error.hint || ''}</td></tr>`
      return
    }

    console.log('Data loaded:', data?.length || 0, 'rows, total:', count, 'pages:', Math.ceil((count || 0) / PAGE_SIZE))

    totalRecords = count || 0
    totalPages = Math.ceil(totalRecords / PAGE_SIZE)
    
    tbody.innerHTML = ''

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="loading">No hay datos disponibles</td></tr>'
      updatePaginationControls()
      return
    }

    data.forEach(row => {
    const tr = document.createElement('tr')

    const cols = ['id', 'gender', 'ethnicity', 'parental_education', 'lunch', 'test_prep', 'math_score', 'reading_score', 'writing_score', 'pass_math']

    cols.forEach(col => {
      const td = document.createElement('td')

      if (col === 'pass_math') {
        td.innerHTML = row[col] === 1
          ? '<span class="badge pass">Aprobado</span>'
          : '<span class="badge fail">Reprobado</span>'
      } else if (EDITABLE_COLS.includes(col)) {
        td.textContent = row[col]
        td.contentEditable = 'true'
        td.addEventListener('blur', () => saveCell(row.id, col, td.textContent.trim(), td, tr))
      } else {
        td.textContent = row[col]
      }

      tr.appendChild(td)
    })

    // Agregar botones de acción
    const actionTd = document.createElement('td')
    actionTd.innerHTML = `
      <div class="action-buttons">
        <button class="action-btn edit" onclick="openEditModal(${row.id})" title="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn delete" onclick="deleteRecord(${row.id})" title="Eliminar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `
    tr.appendChild(actionTd)

    tbody.appendChild(tr)
  })
  
  console.log('Table rendered with', tbody.children.length, 'rows')
  
  // Actualizar controles de paginación
  updatePaginationControls()
  } catch (err) {
    console.error('Unexpected error in renderTable:', err)
    tbody.innerHTML = `<tr><td colspan="11" class="loading">Error inesperado: ${err.message}</td></tr>`
  }
}

// ─── CONTROLES DE PAGINACIÓN ──────────────────────────────────────────────────
function updatePaginationControls() {
  document.getElementById('current-page').textContent = currentPage
  document.getElementById('total-pages').textContent = totalPages
  
  document.getElementById('prev-btn').disabled = currentPage === 1
  document.getElementById('next-btn').disabled = currentPage === totalPages
}

function prevPage() {
  if (currentPage > 1) {
    renderTable(currentPage - 1)
  }
}

function nextPage() {
  if (currentPage < totalPages) {
    renderTable(currentPage + 1)
  }
}

// ─── GUARDAR CELDA EN SUPABASE ────────────────────────────────────────────────
async function saveCell(id, column, value, td, tr) {
  const numVal = Number(value)
  if (isNaN(numVal) || numVal < 0 || numVal > 100) {
    showToast('Valor inválido (0–100)')
    return
  }

  // Recalcular pass_math si se edita math_score
  const updates = { [column]: numVal }
  if (column === 'math_score') {
    updates.pass_math = numVal >= 60 ? 1 : 0
  }

  const { error } = await db.from('students').update(updates).eq('id', id)

  if (error) {
    showToast('Error al guardar')
    console.error(error)
    return
  }

  showToast('Guardado ✓')

  // Actualizar badge de pass_math en la misma fila si aplica
  if (column === 'math_score') {
    const lastTd = tr.querySelector('td:last-child')
    lastTd.innerHTML = numVal >= 60
      ? '<span class="badge pass">Aprobado</span>'
      : '<span class="badge fail">Reprobado</span>'
  }
  
  // Recargar la tabla manteniendo la página actual
  renderTable(currentPage)
}

// ─── MODAL DE EDICIÓN ──────────────────────────────────────────────────────────
async function openEditModal(id) {
  const { data, error } = await db.from('students').select('*').eq('id', id).single()

  if (error) {
    showToast('Error al cargar registro')
    console.error(error)
    return
  }

  // Llenar el formulario con los datos
  document.getElementById('edit-id').value = data.id
  document.getElementById('edit-gender').value = data.gender
  document.getElementById('edit-ethnicity').value = data.ethnicity
  document.getElementById('edit-parental-education').value = data.parental_education
  document.getElementById('edit-lunch').value = data.lunch
  document.getElementById('edit-test-prep').value = data.test_prep
  document.getElementById('edit-math-score').value = data.math_score
  document.getElementById('edit-reading-score').value = data.reading_score
  document.getElementById('edit-writing-score').value = data.writing_score

  // Mostrar el modal
  document.getElementById('edit-modal').classList.add('show')
}

function closeModal() {
  document.getElementById('edit-modal').classList.remove('show')
  document.getElementById('edit-form').reset()
}

// ─── MODAL DE AGREGAR REGISTRO ─────────────────────────────────────────────────
function openAddModal() {
  // Limpiar el formulario
  document.getElementById('add-form').reset()
  
  // Calcular el siguiente ID disponible
  getNextAvailableId().then(nextId => {
    document.getElementById('add-id').value = nextId
  })
  
  // Mostrar el modal
  document.getElementById('add-modal').classList.add('show')
}

function closeAddModal() {
  document.getElementById('add-modal').classList.remove('show')
  document.getElementById('add-form').reset()
}

async function getNextAvailableId() {
  const { data, error } = await db
    .from('students')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
  
  if (error || !data || data.length === 0) {
    return 1
  }
  
  return data[0].id + 1
}

// Manejar el envío del formulario de agregar
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(e.target)

  const newRecord = {
    id: Number(formData.get('id')),
    gender: formData.get('gender'),
    ethnicity: formData.get('ethnicity'),
    parental_education: formData.get('parental_education'),
    lunch: formData.get('lunch'),
    test_prep: formData.get('test_prep'),
    math_score: Number(formData.get('math_score')),
    reading_score: Number(formData.get('reading_score')),
    writing_score: Number(formData.get('writing_score')),
    pass_math: Number(formData.get('math_score')) >= 60 ? 1 : 0
  }

  const { error } = await db.from('students').insert(newRecord)

  if (error) {
    showToast('Error al agregar registro')
    console.error(error)
    return
  }

  showToast('Registro agregado ✓')
  closeAddModal()
  renderTable(currentPage) // Recargar la tabla
})

// Manejar el envío del formulario de edición
document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const id = document.getElementById('edit-id').value
  const formData = new FormData(e.target)

  const updates = {
    gender: formData.get('gender'),
    ethnicity: formData.get('ethnicity'),
    parental_education: formData.get('parental_education'),
    lunch: formData.get('lunch'),
    test_prep: formData.get('test_prep'),
    math_score: Number(formData.get('math_score')),
    reading_score: Number(formData.get('reading_score')),
    writing_score: Number(formData.get('writing_score')),
  }

  // Recalcular pass_math
  updates.pass_math = updates.math_score >= 60 ? 1 : 0

  const { error } = await db.from('students').update(updates).eq('id', id)

  if (error) {
    showToast('Error al guardar cambios')
    console.error(error)
    return
  }

  showToast('Cambios guardados ✓')
  closeModal()
  renderTable() // Recargar la tabla
})

// ─── ELIMINAR REGISTRO ─────────────────────────────────────────────────────────
async function deleteRecord(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
    return
  }

  const { error } = await db.from('students').delete().eq('id', id)

  if (error) {
    showToast('Error al eliminar registro')
    console.error(error)
    return
  }

  showToast('Registro eliminado ✓')
  
  // Si estamos en la última página y se eliminó el último registro, ir a la página anterior
  if (currentPage === totalPages && totalRecords % PAGE_SIZE === 1) {
    currentPage = Math.max(1, currentPage - 1)
  }
  
  renderTable(currentPage) // Recargar la tabla manteniendo la página actual
}

// ─── INIT ────────────────────────────────────────────────────────────────────
renderTable(1) // Cargar tabla por defecto al iniciar