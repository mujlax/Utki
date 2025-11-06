import { google } from 'googleapis'
import { env } from '../src/server/config/env.js'

const REQUIRED_PRIZE_COLUMNS = [
  'prizeId',
  'name',
  'description',
  'rarity',
  'baseWeight',
  'directBuyEnabled',
  'directBuyPrice',
  'active',
  'removeAfterWin',
]

async function updatePrizesSheet() {
  try {
    console.log('🔧 Updating Prizes sheet structure...\n')
    
    const auth = new google.auth.JWT({
      email: env.serviceAccountEmail,
      key: env.serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    
    const sheets = google.sheets({ version: 'v4', auth })
    
    // Get current headers
    const { data: headerData } = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: 'Prizes!A1:I1',
    })
    
    const currentHeaders = (headerData.values?.[0] || []) as string[]
    console.log('Current headers:', currentHeaders.join(', '))
    console.log('Required headers:', REQUIRED_PRIZE_COLUMNS.join(', '))
    
    // Check if removeAfterWin exists
    const hasRemoveAfterWin = currentHeaders.includes('removeAfterWin')
    
    if (hasRemoveAfterWin) {
      console.log('\n✅ Column "removeAfterWin" already exists!')
      return
    }
    
    console.log('\n⚠️  Column "removeAfterWin" is missing. Adding it...')
    
    // Find the position to insert (after 'active')
    const activeIndex = currentHeaders.indexOf('active')
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : currentHeaders.length
    
    // Update headers
    const newHeaders = [...currentHeaders]
    if (insertIndex <= currentHeaders.length) {
      newHeaders.splice(insertIndex, 0, 'removeAfterWin')
    } else {
      newHeaders.push('removeAfterWin')
    }
    
    // Ensure all required columns are present
    REQUIRED_PRIZE_COLUMNS.forEach((col) => {
      if (!newHeaders.includes(col)) {
        newHeaders.push(col)
      }
    })
    
    // Update the header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.spreadsheetId,
      range: 'Prizes!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [newHeaders],
      },
    })
    
    console.log('✅ Headers updated successfully!')
    console.log('New headers:', newHeaders.join(', '))
    
    // Get number of data rows to fill default values
    const { data: allData } = await sheets.spreadsheets.values.get({
      spreadsheetId: env.spreadsheetId,
      range: 'Prizes!A:I',
    })
    
    const dataRows = (allData.values || []).slice(1) // Skip header
    if (dataRows.length > 0) {
      const removeAfterWinIndex = newHeaders.indexOf('removeAfterWin')
      
      // Update existing rows with default value FALSE
      const updates = dataRows.map((row: string[], index: number) => {
        const updatedRow = [...row]
        // Ensure row has enough columns
        while (updatedRow.length <= removeAfterWinIndex) {
          updatedRow.push('')
        }
        // Set default value if empty
        if (!updatedRow[removeAfterWinIndex] || updatedRow[removeAfterWinIndex].trim() === '') {
          updatedRow[removeAfterWinIndex] = 'FALSE'
        }
        return {
          range: `Prizes!A${index + 2}:${String.fromCharCode(65 + newHeaders.length - 1)}${index + 2}`,
          values: [updatedRow],
        }
      })
      
      // Batch update all rows
      const batchUpdate = {
        valueInputOption: 'RAW',
        data: updates,
      }
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: env.spreadsheetId,
        requestBody: batchUpdate,
      })
      
      console.log(`✅ Updated ${dataRows.length} existing rows with default value FALSE`)
    }
    
    console.log('\n✅ Prizes sheet structure updated successfully!')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

updatePrizesSheet()

