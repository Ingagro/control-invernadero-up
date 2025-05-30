const loginForm = document.getElementById("loginForm");

const changePasswordBtn = document.getElementById(
	"changePasswordBtn"
);
const changePasswordModal = document.getElementById(
	"changePasswordModal"
);
const changePasswordForm = document.getElementById(
	"changePasswordForm"
);
const cancelChangePasswordBtn = document.getElementById(
	"cancelChangePasswordBtn"
);
const sendChangePasswordBtn = document.getElementById(
	"sendChangePasswordBtn"
);

function showMessage(message, type) {
	const existingMessage =
		document.querySelector(".message");
	if (existingMessage) {
		existingMessage.remove();
	}

	const messageDiv = document.createElement("div");
	messageDiv.className = `message ${type}`;
	messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

	if (type === "success") {
		messageDiv.style.backgroundColor =
			"var(--color-primary)";
	} else {
		messageDiv.style.backgroundColor = "#ef4444";
	}

	messageDiv.textContent = message;
	document.body.appendChild(messageDiv);

	setTimeout(() => {
		if (messageDiv && messageDiv.parentNode) {
			messageDiv.remove();
		}
	}, 5000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function setLoading(button, isLoading) {
	const btnText = button.querySelector(".btn-text");
	if (isLoading) {
		button.disabled = true;
		btnText.innerHTML =
			'<span class="loading"></span>Procesando...';
	} else {
		button.disabled = false;
		btnText.textContent =
			button.id === "loginBtn"
				? "Iniciar Sesión"
				: "Enviar Enlace";
	}
}

function validateField(input) {
	const value = input.value.trim();
	let isValid = true;

	if (input.type === "email") {
		isValid = value && isValidEmail(value);
	} else if (input.type === "password") {
		isValid = value.length >= 6;
	} else {
		isValid = value.length > 0;
	}

	if (isValid) {
		input.classList.remove("error");
	} else {
		input.classList.add("error");
	}

	return isValid;
}

loginForm.addEventListener("submit", async (e) => {
	e.preventDefault();

	const email = document.getElementById("email");
	const password = document.getElementById("password");

	const isEmailValid = validateField(email);
	const isPasswordValid = validateField(password);

	if (isEmailValid && isPasswordValid) {
		setLoading(loginBtn, true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: email.value.trim(),
					password: password.value,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setLoading(loginBtn, false);

				showMessage(
					"Inicio de sesión exitoso. Redirigiendo...",
					"success"
				);

				setTimeout(() => {
					window.location.href = "/index.html";
				}, 1000);
			} else {
				setLoading(loginBtn, false);
				showMessage(
					data.error || "Error en el inicio de sesión",
					"error"
				);
			}
		} catch (error) {
			setLoading(loginBtn, false);
			showMessage(
				"Error de conexión. Intenta de nuevo.",
				"error"
			);
			console.error("Error en login:", error);
		}
	}
});

function showChangePasswordModal() {
	changePasswordModal.style.display = "flex";
	document.getElementById("changeEmail").focus();
}

function closeChangePasswordModal() {
	changePasswordModal.style.display = "none";
	["changeEmail", "currentPassword", "newPassword"].forEach(
		(id) => {
			const el = document.getElementById(id);
			el.value = "";
			el.classList.remove("error");
		}
	);
}

changePasswordBtn.addEventListener(
	"click",
	showChangePasswordModal
);
cancelChangePasswordBtn.addEventListener(
	"click",
	closeChangePasswordModal
);
changePasswordModal.addEventListener("click", (e) => {
	if (e.target === changePasswordModal)
		closeChangePasswordModal();
});
document.addEventListener("keydown", (e) => {
	if (
		e.key === "Escape" &&
		changePasswordModal.style.display === "flex"
	) {
		closeChangePasswordModal();
	}
});

function validateChangePasswordFields() {
	const email = document.getElementById("changeEmail");
	const currentPassword = document.getElementById(
		"currentPassword"
	);
	const newPassword =
		document.getElementById("newPassword");
	let valid = true;
	if (!isValidEmail(email.value.trim())) {
		email.classList.add("error");
		valid = false;
	} else {
		email.classList.remove("error");
	}
	if (
		!currentPassword.value ||
		currentPassword.value.length < 6
	) {
		currentPassword.classList.add("error");
		valid = false;
	} else {
		currentPassword.classList.remove("error");
	}
	if (!newPassword.value || newPassword.value.length < 6) {
		newPassword.classList.add("error");
		valid = false;
	} else {
		newPassword.classList.remove("error");
	}
	return valid;
}

changePasswordForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (!validateChangePasswordFields()) return;
	setLoading(sendChangePasswordBtn, true);
	try {
		const response = await fetch(
			"/api/auth/change-password",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: document
						.getElementById("changeEmail")
						.value.trim(),
					currentPassword: document.getElementById(
						"currentPassword"
					).value,
					newPassword:
						document.getElementById("newPassword").value,
				}),
			}
		);
		const data = await response.json();
		setLoading(sendChangePasswordBtn, false);
		if (response.ok) {
			showMessage(
				"Contraseña cambiada exitosamente",
				"success"
			);
			closeChangePasswordModal();
		} else {
			showMessage(
				data.error || "Error al cambiar la contraseña",
				"error"
			);
		}
	} catch (error) {
		setLoading(sendChangePasswordBtn, false);
		showMessage(
			"Error de conexión. Intenta de nuevo.",
			"error"
		);
		console.error("Error en cambio de contraseña:", error);
	}
});
