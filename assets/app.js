const removeItem = (id) => {
  console.log("Iam called to fetch");
  fetch(`/cart/${id}`, {
    method: "DELETE",
  }).then((res) => {
    return window.location.replace("/cart");
  });
};
