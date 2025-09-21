export const showDeleteConfirmation = async () => {
  return await Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  });
};

export const showSuccessMessage = (title, text) => {
  return Swal.fire(title, text, "success");
};

export const showErrorMessage = (text) => {
  return Swal.fire({
    icon: "error",
    title: "Oops...",
    text: text,
  });
};
