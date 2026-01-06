function checkProperties() {
  const docId = '1EYSD50GB8r14tvZiIemQcwKwK3Uh0VwKozMqcmwzB-0'; // 確認したいドキュメントのID
  const file = Drive.Files.get(docId, { fields: 'name,properties' });
  console.log('ファイル名:', file.name);
  console.log('プロパティ:', JSON.stringify(file.properties, null, 2));
}
