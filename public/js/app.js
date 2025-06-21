// Configuration loading with multiple fallbacks
let AIO_USERNAME = null;
let AIO_KEY = null;
let configLoaded = false;

// Function to load configuration
async function loadConfig() {
	// First try: window variables (injected by server)
	if (window.AIO_USERNAME && window.AIO_KEY) {
		AIO_USERNAME = window.AIO_USERNAME;
		AIO_KEY = window.AIO_KEY;
		configLoaded = true;
		console.log(
			"Configuration loaded from window variables"
		);
		return true;
	}

	// Second try: API endpoint
	try {
		const response = await fetch("/api/config");
		if (response.ok) {
			const config = await response.json();
			AIO_USERNAME = config.AIO_USERNAME;
			AIO_KEY = config.AIO_KEY;
			configLoaded = true;
			console.log("Configuration loaded from API");
			return true;
		}
	} catch (error) {
		console.error("Error fetching config from API:", error);
	}

	// Configuration failed to load
	console.error(
		"Failed to load configuration from all sources"
	);
	return false;
}

// Wait for configuration before starting
async function initializeApp() {
	const configSuccess = await loadConfig();
	if (configSuccess && configLoaded) {
		cargarDatosIniciales();
		conectarMQTT();
	} else {
		console.error(
			"Application failed to initialize: Configuration could not be loaded"
		);
		// Show user-friendly error message
		document.body.innerHTML = `
			<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
				<div style="text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
					<h2 style="color: #d32f2f;">Error de Configuración</h2>
					<p>No se pudo cargar la configuración del sistema.</p>
					<p>Por favor, contacte al administrador o intente recargar la página.</p>
					<button onclick="window.location.reload()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
						Recargar Página
					</button>
				</div>
			</div>
		`;
	}
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener(
		"DOMContentLoaded",
		initializeApp
	);
} else {
	initializeApp();
}

const feeds = {
	temp1: "temperatura-1",
	temp2: "temperatura-2",
	hum1: "humedad-relativa-1",
	hum2: "humedad-relativa-2",
	suelo1: "humedad-de-suelo-1",
	suelo2: "humedad-de-suelo-2",
	nebulizadores: "nebulizadores",
	ventiladores: "ventiladores",
	extractor: "extractor",
	modo: "modo",
};

const mqttBrokerUrl = "wss://io.adafruit.com:443/mqtt";
let mqttClient = null;

function conectarMQTT() {
	if (mqttClient && mqttClient.connected) {
		return;
	}

	console.log(
		`Attempting to connect to MQTT broker at ${mqttBrokerUrl}`
	);

	const options = {
		username: AIO_USERNAME,
		password: AIO_KEY,

		reconnectPeriod: 5000,
		connectTimeout: 10 * 1000,
	};

	if (typeof mqtt === "undefined") {
		console.error(
			"MQTT.js library not loaded. Please include it in your HTML."
		);

		// For now, we'll just return and prevent further errors.
		return;
	}

	mqttClient = mqtt.connect(mqttBrokerUrl, options);

	mqttClient.on("connect", () => {
		console.log(
			"Successfully connected to Adafruit IO MQTT broker!"
		);

		for (const feedJsKey in feeds) {
			if (feeds.hasOwnProperty(feedJsKey)) {
				const feedAioKey = feeds[feedJsKey];
				const topic = `${AIO_USERNAME}/feeds/${feedAioKey}`;
				mqttClient.subscribe(topic, { qos: 0 }, (err) => {
					if (!err) {
					} else {
						console.error(
							`Failed to subscribe to ${topic}:`,
							err
						);
					}
				});
			}
		}
	});

	mqttClient.on("message", (topic, payload) => {
		const messageValue = payload.toString();
		console.log(
			`MQTT message received on topic '${topic}': ${messageValue}`
		);

		const topicParts = topic.split("/");
		if (
			topicParts.length < 3 ||
			topicParts[1] !== "feeds"
		) {
			if (topicParts[1] === "errors") {
				console.error(
					`Adafruit IO MQTT Error: ${messageValue} on topic ${topic}`
				);
			} else if (topicParts[1] === "throttle") {
				console.warn(
					`Adafruit IO MQTT Throttle: ${messageValue} on topic ${topic}`
				);
			} else {
				console.warn(
					"Received message on unexpected MQTT topic structure:",
					topic
				);
			}
			return;
		}
		const feedAioKeyFromTopic = topicParts[2];

		try {
			if (feedAioKeyFromTopic === feeds.temp1)
				document.getElementById("temp1").textContent =
					messageValue + " °C";
			if (feedAioKeyFromTopic === feeds.temp2)
				document.getElementById("temp2").textContent =
					messageValue + " °C";
			if (feedAioKeyFromTopic === feeds.hum1)
				document.getElementById("hum1").textContent =
					messageValue + " %";
			if (feedAioKeyFromTopic === feeds.hum2)
				document.getElementById("hum2").textContent =
					messageValue + " %";
			if (feedAioKeyFromTopic === feeds.suelo1)
				document.getElementById("suelo1").textContent =
					messageValue + " %";
			if (feedAioKeyFromTopic === feeds.suelo2)
				document.getElementById("suelo2").textContent =
					messageValue + " %";

			if (feedAioKeyFromTopic === feeds.nebulizadores) {
				document.getElementById(
					"estadoNebulizadores"
				).textContent = messageValue;
				if (
					document.getElementById("modoSelect").value ===
					"manual"
				) {
					actualizarBotonesControl(
						"nebulizadores",
						messageValue
					);
				}
			}
			if (feedAioKeyFromTopic === feeds.ventiladores) {
				document.getElementById(
					"estadoVentiladores"
				).textContent = messageValue;
				if (
					document.getElementById("modoSelect").value ===
					"manual"
				) {
					actualizarBotonesControl(
						"ventiladores",
						messageValue
					);
				}
			}
			if (feedAioKeyFromTopic === feeds.extractor) {
				document.getElementById(
					"estadoExtractor"
				).textContent = messageValue;
				if (
					document.getElementById("modoSelect").value ===
					"manual"
				) {
					actualizarBotonesControl(
						"extractor",
						messageValue
					);
				}
			}
			if (feedAioKeyFromTopic === feeds.modo) {
				document.getElementById("modoSelect").value =
					messageValue;
				const botones = document.querySelectorAll(
					".button-group button"
				);
				if (messageValue === "auto") {
					botones.forEach((btn) => (btn.disabled = true));
				} else {
					(async () => {
						const estados = {
							nebulizadores: document.getElementById(
								"estadoNebulizadores"
							).textContent,
							ventiladores: document.getElementById(
								"estadoVentiladores"
							).textContent,
							extractor: document.getElementById(
								"estadoExtractor"
							).textContent,
						};
						for (const actuador in estados) {
							actualizarBotonesControl(
								actuador,
								estados[actuador]
							);
						}
					})();
				}
			}
		} catch (e) {
			console.error(
				"Error processing MQTT message and updating DOM:",
				e,
				{
					topic,
					messageValue,
				}
			);
		}
	});

	mqttClient.on("error", (err) => {
		console.error("MQTT Client Error:", err);
	});

	mqttClient.on("close", () => {
		console.warn(
			"MQTT connection closed. MQTT.js will attempt to reconnect if configured."
		);
	});

	mqttClient.on("offline", () => {});

	mqttClient.on("reconnect", () => {});
}

async function enviarControl(actuador, estado) {
	try {
		const feedKey = feeds[actuador];
		const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data`;

		if (actuador === "nebulizadores")
			document.getElementById(
				"estadoNebulizadores"
			).textContent = estado;
		if (actuador === "ventiladores")
			document.getElementById(
				"estadoVentiladores"
			).textContent = estado;
		if (actuador === "extractor")
			document.getElementById(
				"estadoExtractor"
			).textContent = estado;

		actualizarBotonesControl(actuador, estado);

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"X-AIO-Key": AIO_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ value: estado }),
		});

		if (res.ok) {
		} else {
			console.error(
				`Error al enviar ${estado} a ${actuador}`
			);
		}
	} catch (error) {
		console.error(
			`Error en la solicitud al enviar comando a ${actuador}:`,
			error
		);
	}
}

function actualizarBotonesControl(actuador, estado) {
	let buttonGroup = null;
	const grupos = document.querySelectorAll(
		".control-group h3"
	);
	const nombreCapitalizado = capitalizar(actuador);

	for (let i = 0; i < grupos.length; i++) {
		if (
			grupos[i].textContent.trim() === nombreCapitalizado
		) {
			buttonGroup =
				grupos[i].parentElement.querySelector(
					".button-group"
				);
			break;
		}
	}

	// Fallback if h3 text doesn't match (e.g. due to dynamic changes or typos)

	if (!buttonGroup) {
		const controlGroups = document.querySelectorAll(
			".control-group"
		);
		if (actuador === "nebulizadores" && controlGroups[0])
			buttonGroup =
				controlGroups[0].querySelector(".button-group");
		else if (
			actuador === "ventiladores" &&
			controlGroups[1]
		)
			buttonGroup =
				controlGroups[1].querySelector(".button-group");
		else if (actuador === "extractor" && controlGroups[2])
			buttonGroup =
				controlGroups[2].querySelector(".button-group");
	}

	if (!buttonGroup) {
		return;
	}

	const [btnOn, btnOff] =
		buttonGroup.querySelectorAll("button");
	if (estado === "ON") {
		btnOn.disabled = true;
		btnOff.disabled = false;
	} else {
		btnOn.disabled = false;
		btnOff.disabled = true;
	}
}

function capitalizar(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function cambiarModo() {
	const modo = document.getElementById("modoSelect").value;
	const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feeds.modo}/data`;

	const botones = document.querySelectorAll(
		".button-group button"
	);
	if (modo === "auto") {
		botones.forEach((btn) => (btn.disabled = true));
	} else {
		(async () => {
			const estados = {
				nebulizadores: await obtenerDato(
					feeds.nebulizadores
				),
				ventiladores: await obtenerDato(feeds.ventiladores),
				extractor: await obtenerDato(feeds.extractor),
			};
			for (const actuador in estados) {
				if (estados[actuador] !== "No disponible") {
					actualizarBotonesControl(
						actuador,
						estados[actuador]
					);
				}
			}
		})();
	}

	fetch(url, {
		method: "POST",
		headers: {
			"X-AIO-Key": AIO_KEY,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ value: modo }),
	})
		.then((response) => {
			if (response.ok) {
			} else {
				console.error("Error al cambiar el modo");
			}
		})
		.catch((error) => {
			console.error(
				"Error en la solicitud al cambiar modo:",
				error
			);
		});
}

document.addEventListener("DOMContentLoaded", async () => {
	let modo = await obtenerDato(feeds.modo);

	if (modo !== "auto" && modo !== "manual") {
		console.warn(
			`Modo '${modo}' no reconocido, estableciendo a 'auto'.`
		);
		modo = "auto";
		try {
			// Attempt to set the mode to 'auto' on Adafruit IO if it's invalid
			await fetch(
				`https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feeds.modo}/data`,
				{
					method: "POST",
					headers: {
						"X-AIO-Key": AIO_KEY,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ value: modo }),
				}
			);
			console.log(
				"Modo inicial establecido como Automático en Adafruit IO."
			);
		} catch (error) {
			console.error(
				"Error al establecer modo automático inicial en Adafruit IO:",
				error
			);
		}
	}

	document.getElementById("modoSelect").value = modo;

	const botones = document.querySelectorAll(
		".button-group button"
	);
	if (modo === "auto") {
		botones.forEach((btn) => (btn.disabled = true));
	} else {
		const estados = {
			nebulizadores: await obtenerDato(feeds.nebulizadores),
			ventiladores: await obtenerDato(feeds.ventiladores),
			extractor: await obtenerDato(feeds.extractor),
		};
		for (const actuador in estados) {
			if (estados[actuador] !== "No disponible") {
				actualizarBotonesControl(
					actuador,
					estados[actuador]
				);
			}
		}
	}
});

async function obtenerDato(feed) {
	try {
		const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feed}/data/last`;
		const res = await fetch(url, {
			headers: {
				"X-AIO-Key": AIO_KEY,
			},
		});

		if (!res.ok) {
			console.error(
				`Error en la solicitud para obtener datos de ${feed}: ${res.status} ${res.statusText}`
			);
			const errorBody = await res.text();
			console.error("Error body:", errorBody);
			return "No disponible";
		}
		const data = await res.json();
		return data.value;
	} catch (error) {
		console.error(
			`Error al obtener el dato para ${feed}:`,
			error
		);
		return "No disponible";
	}
}

async function cargarDatosIniciales() {
	const updateElement = async (
		elementId,
		feedKey,
		suffix = ""
	) => {
		const element = document.getElementById(elementId);
		if (element) {
			const value = await obtenerDato(feedKey);
			element.textContent = value + suffix;
		} else {
			console.warn(
				`Element with ID '${elementId}' not found.`
			);
		}
	};

	await updateElement("temp1", feeds.temp1, " °C");
	await updateElement("temp2", feeds.temp2, " °C");
	await updateElement("hum1", feeds.hum1, " %");
	await updateElement("hum2", feeds.hum2, " %");
	await updateElement("suelo1", feeds.suelo1, " %");
	await updateElement("suelo2", feeds.suelo2, " %");
	await updateElement(
		"estadoNebulizadores",
		feeds.nebulizadores
	);
	await updateElement(
		"estadoVentiladores",
		feeds.ventiladores
	);
	await updateElement("estadoExtractor", feeds.extractor);
}
