import { readFile, writeFileSync } from 'fs';
import neatCsv from 'neat-csv';
import ObjectsToCsv from 'objects-to-csv';

import _ from 'lodash';
import turf from '@turf/turf';

const addProperties = (geoJson, area) => {
	const localGeoJson = Object.assign({}, geoJson);
	Object.entries(area).forEach(([key, value]) => {
		for (let d = 0; d < localGeoJson.features.length; d += 1) {
			if (localGeoJson.features[d].properties.quartiere === key) {
				localGeoJson.features[d].properties.monumenti = value;
				break;
			}
		}
	});

	writeFileSync('./newQuartieri.json', JSON.stringify(localGeoJson));
};


readFile('./data.csv', async (err1, importData) => {
	if (err1) {
		console.error(err1);
		return;
	}

	const data = await neatCsv(importData, { separator: ';' });
	console.log(data.length);

	readFile('./quartieri.json', async (err2, importGeoJson) => {
		if (err2) {
			console.error(err2);
			return;
		}
	
		const geoJson = JSON.parse(importGeoJson);

		const newData = [];

		let inserted = 0;
		const inArr = [];

		const result = [];
		geoJson.features.forEach((areas) => {
			const area = turf.multiPolygon(areas.geometry.coordinates);

			data.forEach((d) => {
				const point = turf.point([+d.LONGITUDE, +d.LATITUDE]);
				if (turf.booleanPointInPolygon(point, area)) {
					result.push(areas.properties.quartiere);

					newData.push(({
						...d,
						quartiere: areas.properties.quartiere,
					}));

					inserted += 1;
					inArr.push(d);
				}
			});
		});

		console.log(inserted);
		const difference = data.filter(x => !inArr.includes(x));
		console.log(difference);

		const newCsvData = new ObjectsToCsv(newData);
		await newCsvData.toDisk('./newData.csv');

		const resultCount = _.countBy(result);
		addProperties(geoJson, resultCount);
	});
});